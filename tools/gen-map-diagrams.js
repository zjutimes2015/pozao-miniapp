#!/usr/bin/env node
/**
 * gen-map-diagrams.js — 生成功能地图的三张视图
 *
 * 为什么用脚本生成而非存图片：
 *   1. 代码里的节点 ID 变了，图能自动跟着变
 *   2. 图和 feature-map.md 同源，不会各自漂移
 *   3. 可 diff —— 图变了能看出改了什么
 *
 * 用法：
 *   node tools/gen-map-diagrams.js              # 输出到 docs/diagrams/
 *   node tools/gen-map-diagrams.js --out /tmp   # 指定输出目录
 *
 * 输出三个 SVG：
 *   01-overview.svg    全景与依赖热度
 *   02-flow.svg        首测答题链路
 *   03-training.svg    训练层三模式与 ARG 边界
 */

const fs = require('fs');
const path = require('path');

// ============ 输出目录 ============
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = outIdx !== -1
  ? path.resolve(args[outIdx + 1])
  : path.resolve(__dirname, '..', 'docs', 'diagrams');

fs.mkdirSync(OUT, { recursive: true });

// ============ 公共片段 ============
const STYLE = `
<style>
.th{font-family:var(--font-sans);font-size:13px;font-weight:500}
.ts{font-family:var(--font-sans);font-size:11px;font-weight:400}
.tm{font-family:var(--font-mono);font-size:10px;font-weight:400}
</style>`;

const ARROW = `<defs>
<marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>`;

const wrap = (h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="${h}" viewBox="0 0 680 ${h}">
${STYLE}
${body}
</svg>`;

// ============ 图 1：全景与依赖热度 ============
// 数据来源：grep -rln "模块名" --include="*.js" 的统计结果
const MODULES = [
  { name: 'argue-engine', deps: 6, risk: '高', color: '#185FA5' },
  { name: 'compliance', deps: 5, risk: '高', color: '#185FA5' },
  { name: 'data/levels', deps: 4, risk: '中', color: '#85B7EB' },
  { name: 'app.js', deps: 3, risk: '中', color: '#85B7EB' },
  { name: 'arg-framework', deps: 2, risk: '低', color: '#B5D4F4' },
];

const PAGES = [
  { name: '单闯页', desc: '五关叙事拆招' },
  { name: '对攻页', desc: '双人同题拆解' },
  { name: '训练页', desc: '每日三题 · 论证质量' },
  { name: '我的页', desc: '隐私与数据清空' },
];

function overview() {
  const H = 388;
  let b = '';
  b += `<text class="ts" x="40" y="24" fill="#5F5E5A" dominant-baseline="central">用户可见层 · TabBar 四页</text>`;

  PAGES.forEach((p, i) => {
    const x = 40 + i * 154;
    b += `<rect x="${x}" y="40" width="138" height="56" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>`;
    b += `<text class="th" x="${x + 69}" y="60" fill="#042C53" text-anchor="middle" dominant-baseline="central">${p.name}</text>`;
    b += `<text class="ts" x="${x + 69}" y="79" fill="#185FA5" text-anchor="middle" dominant-baseline="central">${p.desc}</text>`;
  });

  b += `<text class="tm" x="40" y="114" fill="#8B8A85" dominant-baseline="central">PAGE-003 指纹页不在 TabBar —— 单闯五关完成后 redirectTo 跳转</text>`;
  b += `<text class="ts" x="40" y="148" fill="#5F5E5A" dominant-baseline="central">工具层 · 被依赖次数决定改动风险</text>`;
  b += `<text class="ts" x="40" y="170" fill="#8B8A85" dominant-baseline="central">模块</text>`;
  b += `<text class="ts" x="200" y="170" fill="#8B8A85" dominant-baseline="central">被依赖</text>`;
  b += `<text class="ts" x="452" y="170" fill="#8B8A85" dominant-baseline="central">次数</text>`;
  b += `<text class="ts" x="492" y="170" fill="#8B8A85" dominant-baseline="central">风险</text>`;

  const riskColor = { '高': '#A32D2D', '中': '#854F0B', '低': '#0F6E56' };
  MODULES.forEach((m, i) => {
    const y = 196 + i * 34;
    const w = m.deps * 40;
    b += `<text class="tm" x="40" y="${y}" fill="#1C1C1A" dominant-baseline="central">${m.name}</text>`;
    b += `<rect x="200" y="${y - 7}" width="${w}" height="14" rx="7" fill="${m.color}"/>`;
    b += `<text class="tm" x="452" y="${y}" fill="#5F5E5A" dominant-baseline="central">${m.deps}</text>`;
    b += `<text class="tm" x="492" y="${y}" fill="${riskColor[m.risk]}" dominant-baseline="central">${m.risk}</text>`;
  });

  b += `<text class="ts" x="40" y="368" fill="#5F5E5A" dominant-baseline="central">改 argue-engine 之前先跑三套测试 —— 它牵着全部页面与测试</text>`;
  return wrap(H, b);
}

// ============ 图 2：首测答题链路 ============
const CHAIN = [
  { id: 'PAGE-001 单闯页', desc: '读取关卡进度，决定加载第几关', note: 'UI-001 关卡条 / UI-002 方向标签', fill: '#E6F1FB', stroke: '#185FA5', fg: '#042C53', sub: '#185FA5' },
  { id: 'UI-003 卡片 · UI-004 谬误选择', desc: '呈现前提卡、结论卡、15 类谬误 chip', note: 'RULE-004 定义', fill: '#E6F1FB', stroke: '#185FA5', fg: '#042C53', sub: '#185FA5' },
  { id: 'ACT-001 选断点 · ACT-002 选类型', desc: '两个动作都缺失则不允许提交', note: 'C-003 必须用户作答', fill: '#FAEEDA', stroke: '#854F0B', fg: '#412402', sub: '#854F0B' },
  { id: 'RULE-001 真值表 · RULE-002 判定', desc: '形式类穷举判定，其余比对断点与类型', note: 'C-002 不得交给 AI', fill: '#FCEBEB', stroke: '#A32D2D', fg: '#501313', sub: '#A32D2D' },
  { id: 'STORE-001 写入 pz_logs', desc: '唯一数据源，纯本地，不上传', note: 'FLOW-002 解锁下关', fill: '#E1F5EE', stroke: '#0F6E56', fg: '#04342C', sub: '#0F6E56' },
  { id: 'RULE-005 指纹聚合', desc: '贝叶斯平滑后按三组排序', note: 'minSamples 3', fill: '#E1F5EE', stroke: '#0F6E56', fg: '#04342C', sub: '#0F6E56' },
  { id: 'PAGE-003 指纹页 · CAP-005 卡片', desc: 'canvas 本地绘制，离线可分享', note: 'C-004 分享无奖励', fill: '#E6F1FB', stroke: '#185FA5', fg: '#042C53', sub: '#185FA5' },
];

function chain() {
  const H = 500;
  let b = ARROW;
  b += `<text class="ts" x="40" y="24" fill="#5F5E5A" dominant-baseline="central">首测链路 · 5 关 × 3 题 = 15 题 · 首关 ≤ 90 秒</text>`;

  CHAIN.forEach((n, i) => {
    const y = 42 + i * 66;
    b += `<rect x="40" y="${y}" width="330" height="44" rx="8" fill="${n.fill}" stroke="${n.stroke}" stroke-width="0.5"/>`;
    b += `<text class="th" x="56" y="${y + 16}" fill="${n.fg}" dominant-baseline="central">${n.id}</text>`;
    b += `<text class="ts" x="56" y="${y + 32}" fill="${n.sub}" dominant-baseline="central">${n.desc}</text>`;
    b += `<text class="tm" x="360" y="${y + 16}" fill="#8B8A85" text-anchor="end" dominant-baseline="central">${n.note}</text>`;
    if (i < CHAIN.length - 1) {
      b += `<path d="M205 ${y + 44}L205 ${y + 62}" fill="none" stroke="#185FA5" stroke-width="1.5" marker-end="url(#ar)"/>`;
    }
  });

  b += `<rect x="396" y="42" width="244" height="150" rx="8" fill="#F1EFE8" stroke="#D3D1C7" stroke-width="0.5"/>`;
  b += `<text class="th" x="412" y="60" fill="#1C1C1A" dominant-baseline="central">这条链路的三个不可动点</text>`;
  b += `<text class="ts" x="412" y="84" fill="#A32D2D" dominant-baseline="central">C-002 真值表不可换成 AI 判断</text>`;
  b += `<text class="ts" x="412" y="106" fill="#A32D2D" dominant-baseline="central">C-003 谬误类型不可代用户选择</text>`;
  b += `<text class="ts" x="412" y="128" fill="#A32D2D" dominant-baseline="central">C-004 分享不可设奖励解锁</text>`;
  b += `<text class="ts" x="412" y="156" fill="#5F5E5A" dominant-baseline="central">违反任一条，指纹数据即失真</text>`;
  b += `<text class="ts" x="412" y="176" fill="#5F5E5A" dominant-baseline="central">或触发平台审核驳回</text>`;
  return wrap(H, b);
}

// ============ 图 3：训练层与 ARG 边界 ============
const MODES = [
  {
    name: '每日三题', rule: 'RULE-013 抽样策略',
    lines: ['最弱分组优先', '单维薄弱项优先', '轮换题库优先', '按 qid 去重 · 组间隔'],
    fill: '#E1F5EE', stroke: '#0F6E56', fg: '#04342C', sub: '#0F6E56',
  },
  {
    name: '论证质量 ARG', rule: 'RULE-007 三关判定',
    lines: ['A 可接受性 · R 相关性', 'G 充分性', '逐项独立判定', '答后揭示隐藏前提'],
    fill: '#EEEDFE', stroke: '#534AB7', fg: '#26215C', sub: '#534AB7',
  },
  {
    name: '怎么回', rule: 'RULE-009 四关筛查',
    lines: ['线性通过制', '停在第一个未过关', '第 3 关双分支应对', '输出话术模板'],
    fill: '#FBEAF0', stroke: '#993556', fg: '#4B1528', sub: '#993556',
  },
];

function training() {
  const H = 424;
  let b = '';
  b += `<text class="ts" x="40" y="24" fill="#5F5E5A" dominant-baseline="central">PAGE-004 训练页 · 三模式切换 · 均从 65 题池与本地日志取数</text>`;

  MODES.forEach((m, i) => {
    const x = 40 + i * 204;
    b += `<rect x="${x}" y="40" width="192" height="118" rx="8" fill="${m.fill}" stroke="${m.stroke}" stroke-width="0.5"/>`;
    b += `<text class="th" x="${x + 16}" y="58" fill="${m.fg}" dominant-baseline="central">${m.name}</text>`;
    b += `<text class="ts" x="${x + 16}" y="78" fill="${m.sub}" dominant-baseline="central">${m.rule}</text>`;
    m.lines.forEach((l, k) => {
      b += `<text class="ts" x="${x + 16}" y="${98 + k * 18}" fill="#5F5E5A" dominant-baseline="central">${l}</text>`;
    });
  });

  b += `<text class="ts" x="40" y="188" fill="#5F5E5A" dominant-baseline="central">RULE-008 · ARG 模式边界 —— 由代码强制，不是约定</text>`;

  b += `<rect x="40" y="204" width="290" height="128" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>`;
  b += `<text class="th" x="56" y="222" fill="#04342C" dominant-baseline="central">ARG 启用</text>`;
  b += `<text class="tm" x="56" y="248" fill="#0F6E56" dominant-baseline="central">train    训练层</text>`;
  b += `<text class="tm" x="56" y="270" fill="#0F6E56" dominant-baseline="central">monthly  月测</text>`;
  b += `<text class="ts" x="56" y="296" fill="#5F5E5A" dominant-baseline="central">已有足够练习量后</text>`;
  b += `<text class="ts" x="56" y="314" fill="#5F5E5A" dominant-baseline="central">再引入三维评估框架</text>`;

  b += `<rect x="350" y="204" width="290" height="128" rx="8" fill="#FCEBEB" stroke="#A32D2D" stroke-width="0.5"/>`;
  b += `<text class="th" x="366" y="222" fill="#501313" dominant-baseline="central">ARG 禁用</text>`;
  b += `<text class="tm" x="366" y="248" fill="#A32D2D" dominant-baseline="central">solo    首测</text>`;
  b += `<text class="tm" x="366" y="270" fill="#A32D2D" dominant-baseline="central">versus  对攻</text>`;
  b += `<text class="ts" x="366" y="296" fill="#5F5E5A" dominant-baseline="central">首测目标是让用户发现</text>`;
  b += `<text class="ts" x="366" y="314" fill="#5F5E5A" dominant-baseline="central">自己不知道，不是教会框架</text>`;

  b += `<rect x="40" y="352" width="600" height="52" rx="8" fill="#F1EFE8" stroke="#D3D1C7" stroke-width="0.5"/>`;
  b += `<text class="th" x="56" y="370" fill="#1C1C1A" dominant-baseline="central">C-001 · 违反后果</text>`;
  b += `<text class="ts" x="56" y="390" fill="#5F5E5A" dominant-baseline="central">首测引入 ARG 会同时增加维度与认知负担，3 分钟流程会超载 —— 由 tests/e2e.test.js 边界断言拦截</text>`;
  return wrap(H, b);
}

// ============ 输�� ============
const outputs = [
  ['01-overview.svg', overview()],
  ['02-chain.svg', chain()],
  ['03-training.svg', training()],
];

console.log(`\n═══ 生成功能地图视图 ═══\n`);
for (const [name, content] of outputs) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, content, 'utf-8');
  console.log(`  ✓ ${name.padEnd(20)} ${content.length} 字节`);
}

// ============ 一致性自检 ============
// 图里引用的节点 ID 必须存在于 feature-map.md
// 否则图会悄悄过期 —— 这是「文档腐化」的主要来源
const MAP_FILE = path.resolve(__dirname, '..', 'docs', 'feature-map.md');
if (fs.existsSync(MAP_FILE)) {
  const mapMd = fs.readFileSync(MAP_FILE, 'utf-8');
  const allSvg = outputs.map(o => o[1]).join('\n');

  // 图中出现的所有节点 ID
  const usedIds = [...new Set(allSvg.match(/\b(?:CAP|PAGE|UI|ACT|FLOW|API|STORE|RULE|TEST)-\d{3}\b/g) || [])];
  // 地图中定义的所有节点 ID
  const mapIds = new Set(
    [...mapMd.matchAll(/\b((?:CAP|PAGE|UI|ACT|FLOW|API|STORE|RULE|TEST)-\d{3})\b/g)].map(m => m[1])
  );

  const orphan = usedIds.filter(id => !mapIds.has(id));

  console.log('─── 一致性自检 ───\n');
  if (orphan.length === 0) {
    console.log(`  ✓ 图中 ${usedIds.length} 个节点 ID 均存在于 feature-map.md`);
  } else {
    console.log(`  ✗ 图中有 ${orphan.length} 个 ID 不在地图里：${orphan.join(', ')}`);
    console.log('    这些图节点已失效，请更新图或恢复地图条目。');
  }

  // 反向：地图里有没有节点完全没被图覆盖（仅供参考，不算错误）
  const uncovered = [...mapIds].filter(id => !usedIds.includes(id));
  if (uncovered.length > 0) {
    console.log(`  ·地图中另有 ${uncovered.length} 个节点未在图中出现（详表里可查）`);
  }
} else {
  console.log('  · 未找到 feature-map.md，跳过一致性自检');
}

console.log(`\n输出目录：${OUT}\n`);
console.log('提示：图与 feature-map.md 同源。改了节点定义请重新生成。\n');