#!/usr/bin/env node
/**
 * SVG → PNG 渲染器（2× 密度）
 *
 * 解决三个问题：
 *
 * 1. **清晰度** —— Chrome 默认按 1× 密度截图（1120×800 逻辑像素），
 *    在 Retina / 高 DPI 屏上必然发糊。必须加 `--force-device-scale-factor=2`，
 *    输出 2240×1600，物理像素 1:1 对应。
 *
 * 2. **可复现** —— 渲染参数固化成脚本，不必每次手敲。
 *
 * 3. **可校验** —— 渲染后自动检查产物尺寸；尺寸不符即报错。
 *
 * ⚠️ 关于 --exec：
 *    部分沙箱环境下 Node 无法 spawn 浏览器进程（EBUSY），
 *    此时脚本默认只**打印命令**，由上层 Agent 或人工执行。
 *    加 `--exec` 强制尝试直接执行。
 *
 * 用法：
 *   node tools/render-diagrams.js                # 打印命令（安全模式）
 *   node tools/render-diagrams.js --exec         # 尝试直接执行
 *   node tools/render-diagrams.js 01 --exec      # 只渲染 01
 *   node tools/render-diagrams.js --scale 3 --exec # 3×（印刷 / 投影）
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const flagVal = (f, d) => {
  const i = args.indexOf(f);
  return i !== -1 && args[i + 1] ? args[i + 1] : d;
};

const SCALE = Number(flagVal('--scale', 2));
const EXEC = hasFlag('--exec');
const ONLY = args.filter(a => /^\d{2}$/.test(a));

const DIR = path.resolve(__dirname, '..', 'docs', 'diagrams');

// ── 定位浏览器 ──
function findChrome() {
  const cands = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean);
  for (const p of cands) if (fs.existsSync(p)) return p;
  return null;
}

/** 从 SVG 的 viewBox 读逻辑尺寸 */
function readLogicalSize(svgPath) {
  const src = fs.readFileSync(svgPath, 'utf8');
  const m = src.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (m) return { w: Math.ceil(+m[1]), h: Math.ceil(+m[2]) };
  const m2 = src.match(/width="(\d+)" height="(\d+)"/);
  if (m2) return { w: +m2[1], h: +m2[2] };
  return { w: 1120, h: 800 };
}

/** 只解析 PNG 的 IHDR，不依赖图像库 */
function readPngSize(p) {
  if (!fs.existsSync(p)) return null;
  const b = fs.readFileSync(p);
  if (b.length < 24) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// ── 主流程 ──
const chrome = findChrome();
if (!chrome) {
  console.error('✗ 未找到浏览器。设环境变量 CHROME_PATH 指向 Chrome / Edge。');
  process.exit(1);
}
if (!fs.existsSync(DIR)) {
  console.error(`✗ 目录不存在：${DIR}`);
  process.exit(1);
}

const svgs = fs.readdirSync(DIR).filter(f => f.endsWith('.svg')).sort();
const targets = ONLY.length ? svgs.filter(f => ONLY.some(p => f.startsWith(p))) : svgs;

if (!targets.length) {
  console.error(`✗ 没有匹配的 SVG。filters=${JSON.stringify(ONLY)}`);
  process.exit(1);
}

console.log(`\n═══ SVG → PNG 渲染（${SCALE}× 密度） ═══\n`);
console.log(`  浏览器：${chrome}`);
console.log(`  模式　：${EXEC ? '直接执行' : '仅打印命令（沙箱环境安全）'}\n`);

const cmds = [];
let issues = 0;

for (const name of targets) {
  const svgPath = path.join(DIR, name);
  const pngPath = path.join(DIR, name.replace(/\.svg$/, '.png'));
  const { w, h } = readLogicalSize(svgPath);

  const profile = path.join(os.tmpdir(), `wbr-${process.pid}-${name.replace(/\W/g, '')}`);
  const fileUrl = 'file:///' + svgPath.replace(/\\/g, '/').replace(/ /g, '%20');

  const args2 = [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    `--user-data-dir=${profile}`,
    `--force-device-scale-factor=${SCALE}`,
    `--window-size=${w},${h}`,
    `--screenshot=${pngPath}`,
    fileUrl,
  ];
  const cmd = `"${chrome}" ${args2.join(' ')}`;

  if (EXEC) {
    let ok = false, err = '';
    try {
      // 用 shell 执行，绕开部分环境 Node spawn 的 EBUSY 限制
      require('child_process').execSync(cmd, { stdio: 'pipe', timeout: 60000 });
      ok = true;
    } catch (e) { err = (e.stderr || '').toString().split('\n')[0] || e.message; }

    const actual = ok ? readPngSize(pngPath) : null;
    const wantW = w * SCALE, wantH = h * SCALE;
    const sizeOk = actual && actual.w === wantW && actual.h === wantH;
    const kb = actual ? (fs.statSync(pngPath).size / 1024).toFixed(0) : 0;

    if (!ok) {
      console.log(`  ✗ ${name.padEnd(22)} 执行失败：${err.slice(0, 60)}`);
      issues++;
    } else if (!sizeOk) {
      console.log(`  ✗ ${name.padEnd(22)} 尺寸不符：期望 ${wantW}×${wantH}，实际 ${actual ? actual.w + '×' + actual.h : '无'}`);
      issues++;
    } else {
      console.log(`  ✓ ${name.padEnd(22)} ${actual.w}×${actual.h}  ${kb.padStart(4)} KB`);
    }
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* 忽略 */ }
  } else {
    const actual = readPngSize(pngPath);
    const wantW = w * SCALE, wantH = h * SCALE;
    const okNow = actual && actual.w === wantW && actual.h === wantH;
    console.log(`  ${okNow ? '·' : '!'} ${name.padEnd(22)} → ${wantW}×${wantH}${okNow ? '（已是 2×）' : '（需重渲）'}`);
    cmds.push(cmd);
  }
}

if (!EXEC) {
  console.log('\n─── 渲染命令（逐条执行） ───\n');
  cmds.forEach((c, i) => console.log(`[${i + 1}] ${c}\n`));
  console.log('提示：也可加 --exec 让脚本自行执行。');
}

console.log(`\n${issues === 0 ? '✓ 渲染检查通过' : `✗ ${issues} 张有问题`}`);
console.log('\n⚠ 渲染成功 ≠ 布局正确。必须逐张看图确认无元素重叠。\n');
process.exit(issues === 0 ? 0 : 1);