#!/usr/bin/env node
/**
 * gen-map-diagrams.js — 生成功能地图视图
 *
 * 设计来源：《生财有术·逻辑地图》
 * 五个关键视觉元素（本脚本必须复刻）：
 *   1. 分组画框（虚线 rect）—— 按层划分能力域
 *   2. 实线箭头 —— 同层/相邻层的主数据流
 *   3. 虚线箭头 —— 跨层关系（规则/数据/测试对页面的约束）
 *   4. 橙色 pill 标签 —— 连线上的性质标注
 *   5. 三层节点卡 —— ID(等宽橙) / 名称(粗体) / 位置(灰小字)
 *
 * 额外：右侧详情面板 + 底部图例 + 底部提问横幅
 *
 * 图由脚本生成而非手存，理由：
 *   1. 节点变了图能自动跟着变
 *   2. 与 feature-map.md 同源，不会各自漂移
 *   3. SVG 可 diff —— 图变了能看出改了什么（PNG 做不到）
 *
 * 用法：node tools/gen-map-diagrams.js [--out 目录]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = outIdx !== -1
  ? path.resolve(args[outIdx + 1])
  : path.resolve(__dirname, '..', 'docs', 'diagrams');

fs.mkdirSync(OUT, { recursive: true });

// ============ 配色（参照原图，自包含不依赖 CSS 变量）============
const C = {
  bg: '#C6F1EA',            // 页面浅青背景
  panel: '#FBFCFE',         // 白色面板
  panelBorder: '#D8DCE3',
  title: '#0E7C6B',         // 标题深青
  nodeFill: '#E8F8F4',      // 节点填充
  nodeStroke: '#3FC7AE',    // 节点描边
  nodeId: '#E8944A',        // 节点 ID 橙色
  nodeName: '#0B3B34',      // 节点名称
  nodeDesc: '#4A7A70',      // 节点位置说明
  groupStroke: '#5FC9B4',   // 分组框
  solid: '#4FB79E',         // 实线箭头
  dash: '#E8944A',          // 虚线箭头
  pill: '#FFF3E0',          // pill 填充
  pillStroke: '#F0A868',
  pillText: '#6B3A12',
  gray: '#5F5E5A',
  grayLight: '#8B8A85',
  groupFill: '#EAFBF7',
};

const FONT_SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Source Han Sans SC', sans-serif`;
const FONT_MONO = `'SF Mono', 'Cascadia Mono', Consolas, 'Liberation Mono', 'Courier New', monospace`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 箭头 marker */
const MARKERS = `
<defs>
<marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M1 1L9 5L1 9" fill="none" stroke="${C.solid}" stroke-width="1.4" stroke-linecap="round"/>
</marker>
<marker id="arD" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M1 1L9 5L1 9" fill="none" stroke="${C.dash}" stroke-width="1.4" stroke-linecap="round"/>
</marker>
</defs>`;

// ============ 组件 ============

/** 分组画框（虚线） */
function group(x, y, w, h, label) {
  return `
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C.groupFill}" stroke="${C.groupStroke}" stroke-width="1" stroke-dasharray="5 4" opacity="0.55"/>
<rect x="${x + 10}" y="${y - 11}" width="${label.length * 11 + 16}" height="18" rx="9" fill="${C.bg}" stroke="${C.groupStroke}" stroke-width="0.8"/>
<text x="${x + 10 + (label.length * 11 + 16) / 2}" y="${y - 2}" font-size="11" fill="${C.title}" text-anchor="middle" font-family="${FONT_SANS}" font-weight="500">${esc(label)}</text>`;
}

/** 三层节点卡：ID / 名称 / 位置 */
function node(x, y, w, id, name, desc, opts = {}) {
  const h = opts.h || 52;
  const fill = opts.fill || C.nodeFill;
  const stroke = opts.stroke || C.nodeStroke;
  return `
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>
<text x="${x + w / 2}" y="${y + 14}" font-size="10" fill="${C.nodeId}" text-anchor="middle" font-family="${FONT_MONO}">${esc(id)}</text>
<text x="${x + w / 2}" y="${y + 31}" font-size="13" fill="${C.nodeName}" text-anchor="middle" font-family="${FONT_SANS}" font-weight="500">${esc(name)}</text>
${desc ? `<text x="${x + w / 2}" y="${y + 44}" font-size="10" fill="${C.nodeDesc}" text-anchor="middle" font-family="${FONT_SANS}">${esc(desc)}</text>` : ''}`;
}

/** 橙色 pill 标签 */
function pill(x, y, text, w) {
  const width = w || text.length * 10 + 18;
  return `
<rect x="${x}" y="${y}" width="${width}" height="17" rx="8.5" fill="${C.pill}" stroke="${C.pillStroke}" stroke-width="0.9"/>
<text x="${x + width / 2}" y="${y + 12}" font-size="10" fill="${C.pillText}" text-anchor="middle" font-family="${FONT_SANS}">${esc(text)}</text>`;
}

/** 实线箭头 */
function solid(x1, y1, x2, y2) {
  return `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${C.solid}" stroke-width="1.4" marker-end="url(#ar)"/>`;
}

/** 虚线箭头 */
function dash(x1, y1, x2, y2) {
  return `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${C.dash}" stroke-width="1.3" stroke-dasharray="5 3" marker-end="url(#arD)"/>`;
}

/** 正交折线（实线，走指定中间 y） */
function elbow(x1, y1, x2, y2, midY) {
  return `<path d="M${x1} ${y1}L${x1} ${midY}L${x2} ${midY}L${x2} ${y2}" fill="none" stroke="${C.solid}" stroke-width="1.4" marker-end="url(#ar)"/>`;
}

/** 正交折线（实线） */
function solidElbow(x1, y1, x2, y2, midY) {
  return `<path d="M${x1} ${y1}L${x1} ${midY}L${x2} ${midY}L${x2} ${y2}" fill="none" stroke="${C.solid}" stroke-width="1.4" marker-end="url(#ar)"/>`;
}

/** 正交折线（虚线） */
function dashElbow(x1, y1, x2, y2, midY) {
  return `<path d="M${x1} ${y1}L${x1} ${midY}L${x2} ${midY}L${x2} ${y2}" fill="none" stroke="${C.dash}" stroke-width="1.3" stroke-dasharray="5 3" marker-end="url(#arD)"/>`;
}

/** 右侧详情面板 */
function detailPanel(x, y, w, h, title, badge, rows) {
  let b = `
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C.panel}" stroke="${C.panelBorder}" stroke-width="1"/>
<line x1="${x}" y1="${y + 30}" x2="${x + w}" y2="${y + 30}" stroke="${C.panelBorder}" stroke-width="1"/>
<text x="${x + 14}" y="${y + 19}" font-size="12" fill="${C.title}" font-family="${FONT_SANS}" font-weight="500">${esc(title)}</text>
<rect x="${x + w - 62}" y="${y + 8}" width="50" height="15" rx="7.5" fill="#F5A623"/>
<text x="${x + w - 37}" y="${y + 19}" font-size="10" fill="#FFFFFF" text-anchor="middle" font-family="${FONT_SANS}">${esc(badge)}</text>`;
  rows.forEach((r, i) => {
    const ry = y + 48 + i * 20;
    const isKey = r.startsWith('不可降级') || r.startsWith('验证路径');
    b += `<text x="${x + 14}" y="${ry}" font-size="10.5" fill="${isKey ? C.nodeId : C.gray}" font-family="${FONT_SANS}">${esc(r)}</text>`;
  });
  return b;
}

/** 说明卡 */
function noteCard(x, y, w, h, title, lines, footLines) {
  let b = `
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C.panel}" stroke="${C.panelBorder}" stroke-width="1"/>
<text x="${x + 14}" y="${y + 20}" font-size="12" fill="${C.title}" font-family="${FONT_SANS}" font-weight="500">${esc(title)}</text>`;
  lines.forEach((l, i) => {
    b += `<circle cx="${x + 17}" cy="${y + 40 + i * 17}" r="3" fill="#1D9E75"/>
<text x="${x + 26}" y="${y + 43 + i * 17}" font-size="10" fill="${C.gray}" font-family="${FONT_SANS}">${esc(l)}</text>`;
  });
  footLines.forEach((l, i) => {
    b += `<text x="${x + 14}" y="${y + 40 + lines.length * 17 + 6 + i * 17}" font-size="10" fill="${C.grayLight}" font-family="${FONT_SANS}">${esc(l)}</text>`;
  });
  return b;
}

/** 底部图例 */
function legend(x, y, w, h) {
  const items = [
    ['\u2460 什么能力 CAP', '形式推理组'],
    ['\u2461 前端页面 PAGE', '五个页面入口'],
    ['\u2462 有哪些按钮 UI', '卡片与选择器'],
    ['\u2463 用户做什么 ACT', '点选与提交'],
    ['\u2464 业务流程 FLOW', '答题到指纹'],
    ['\u2465 数据存什么 STORE', '本地日志'],
    ['\u2466 走什么接口 API', '匿名标识与房间'],
    ['\u2467 怎么判定 RULE', '真值表与边界'],
    ['\u2468 什么测试验证 TEST', '三套测试门禁'],
  ];
  let b = `
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C.panel}" stroke="${C.panelBorder}" stroke-width="1"/>
<circle cx="${x + 15}" cy="${y + 15}" r="3.5" fill="#1D9E75"/>
<text x="${x + 25}" y="${y + 17}" font-size="11" fill="${C.title}" font-family="${FONT_SANS}" font-weight="500">完整的逻辑地图，要回答这 9 个问题：</text>`;
  // 主名与小字同行 —— 两行网格（5 + 4），每格高度仅 22
  items.forEach((it, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const ix = x + 16 + col * ((w - 32) / 5);
    const iy = y + 38 + row * 24;
    b += `<text x="${ix}" y="${iy}" font-size="10" fill="${C.title}" font-family="${FONT_SANS}">${esc(it[0])}</text>
<text x="${ix + 2}" y="${iy + 11}" font-size="9.5" fill="${C.grayLight}" font-family="${FONT_SANS}">（${esc(it[1])}）</text>`;
  });
  return b;
}

/** 左对齐节点卡（链路/模式用）：编号圆点 + ID / 名称 / 位置 + 右侧标注 */
function nodeRow(x, y, w, h, id, name, desc, note, opts = {}) {
  const fill = opts.fill || C.nodeFill;
  const stroke = opts.stroke || C.nodeStroke;
  const tx = opts.no ? x + 14 : x + 34;
  const cy = y + h / 2;
  let b = `
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`;
  if (!opts.no) {
    b += `
<circle cx="${x + 16}" cy="${cy}" r="10" fill="${stroke}" opacity="0.15"/>
<text x="${x + 16}" y="${cy + 4}" font-size="11" fill="${stroke}" text-anchor="middle" font-family="${FONT_MONO}" font-weight="500">${esc(opts.step != null ? String(opts.step) : '')}</text>`;
  }
  b += `
<text x="${tx}" y="${y + 18}" font-size="10" fill="${C.nodeId}" font-family="${FONT_MONO}">${esc(id)}</text>
<text x="${tx}" y="${y + 33}" font-size="12.5" fill="${C.nodeName}" font-family="${FONT_SANS}" font-weight="500">${esc(name)}</text>
${desc ? `<text x="${tx}" y="${y + 46}" font-size="10" fill="${C.nodeDesc}" font-family="${FONT_SANS}">${esc(desc)}</text>` : ''}`;
  if (note) {
    b += `
<text x="${x + w - 14}" y="${cy + 4}" font-size="9.5" fill="${C.grayLight}" text-anchor="end" font-family="${FONT_MONO}">${esc(note)}</text>`;
  }
  return b;
}

/** 箭头（链路用，可带胶囊序号） */
function numberedArrow(x1, y1, x2, y2) {
  return `
<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${C.solid}" stroke-width="1.4" marker-end="url(#ar)"/>`;
}

/** 依赖热度条 */
function heatBar(x, y, w, name, deps, risk, color) {
  const maxD = 6;
  const trackX = x + 186;
  const trackW = w - 310;
  const bw = trackW * deps / maxD;
  const riskColor = { '高': '#A32D2D', '中': '#854F0B', '低': '#0F6E56' };
  return `
<text x="${x}" y="${y + 10}" font-size="10" fill="#1C1C1A" font-family="${FONT_MONO}">${esc(name)}</text>
<rect x="${trackX}" y="${y}" width="${trackW}" height="14" rx="7" fill="${C.groupFill}" opacity="0.5"/>
<rect x="${trackX}" y="${y}" width="${Math.max(bw, 14)}" height="14" rx="7" fill="${color}"/>
<text x="${x + w - 62}" y="${y + 11}" font-size="10" fill="${C.gray}" font-family="${FONT_MONO}" text-anchor="middle">${deps} 次</text>
<text x="${x + w - 24}" y="${y + 11}" font-size="10" fill="${riskColor[risk]}" font-family="${FONT_MONO}" text-anchor="middle">${risk}</text>`;
}

/** 页壳：标题 + 顶部说明条 + 主图区底色（四张图统一） */
function shell(W, H, pageNo, title, subtitle, note) {
  return `<rect width="${W}" height="${H}" fill="${C.bg}"/>
<text x="40" y="34" font-size="20" fill="#0B3B34" font-family="${FONT_SANS}" font-weight="500">${esc(title)}</text>
<text x="40" y="54" font-size="11" fill="#0B3B34" opacity="0.75" font-family="${FONT_SANS}">${esc(subtitle)}</text>
<text x="${W - 40}" y="34" font-size="11" fill="#0B3B34" opacity="0.6" text-anchor="end" font-family="${FONT_MONO}">${esc(pageNo)} / 04</text>
<rect x="40" y="70" width="${W - 80}" height="28" rx="4" fill="${C.panel}" opacity="0.92"/>
<text x="56" y="88" font-size="11" fill="#0B3B34" font-family="${FONT_SANS}" dominant-baseline="central">${note}</text>
<rect x="40" y="108" width="760" height="570" rx="4" fill="#DDF7F0" opacity="0.6" stroke="${C.groupStroke}" stroke-width="0.8" stroke-dasharray="5 4"/>`;
}

/** 底部横幅 */
function banner(W, y, text) {
  return `
<rect x="40" y="${y}" width="${W - 80}" height="30" rx="4" fill="${C.panel}" opacity="0.92"/>
<text x="${W / 2}" y="${y + 19}" font-size="13" fill="#0B3B34" text-anchor="middle" font-family="${FONT_SANS}" font-weight="500" dominant-baseline="central">${esc(text)}</text>`;
}

/** 组内项目符号列表 */
function bullets(x, y, items, color, step) {
  const s = step || 17;
  return items.map((t, i) => `
<circle cx="${x}" cy="${y + i * s}" r="2.6" fill="${color || '#1D9E75'}"/>
<text x="${x + 10}" y="${y + i * s + 3.5}" font-size="10" fill="${C.gray}" font-family="${FONT_SANS}">${esc(t)}</text>`).join('');
}

// ============ 图 01：全景与依赖热度 ============
function overview() {
  const W = 1120, H = 800;

  const PAGES = [
    { id: 'PAGE-001', name: '单闯页', desc: '五关叙事拆招', note: 'TabBar' },
    { id: 'PAGE-002', name: '对攻页', desc: '双人同题', note: 'TabBar' },
    { id: 'PAGE-003', name: '指纹页', desc: '三组表现', note: '跳转' },
    { id: 'PAGE-004', name: '训练页', desc: '三模式', note: 'TabBar' },
    { id: 'PAGE-005', name: '我的页', desc: '隐私与清空', note: 'TabBar' },
  ];
  const MODULES = [
    { id: 'RULE-005', name: 'argue-engine', desc: '判定与指纹', note: '被依赖 6 次' },
    { id: 'RULE-011', name: 'compliance', desc: '禁用词过滤', note: '被依赖 5 次' },
    { id: 'RULE-004', name: 'data/levels', desc: '题库四文件', note: '被依赖 4 次' },
    { id: 'STORE-001', name: 'app.js', desc: '全局状态', note: '被依赖 3 次' },
    { id: 'RULE-007', name: 'arg-framework', desc: 'ARG 三维', note: '被依赖 2 次' },
  ];
  const HEAT = [
    { name: 'utils/argue-engine', deps: 6, risk: '高', color: '#185FA5' },
    { name: 'utils/compliance', deps: 5, risk: '高', color: '#185FA5' },
    { name: 'data/levels', deps: 4, risk: '中', color: '#85B7EB' },
    { name: 'app.js', deps: 3, risk: '中', color: '#85B7EB' },
    { name: 'utils/arg-framework', deps: 2, risk: '低', color: '#B5D4F4' },
  ];
  const GATES = [
    { id: 'TEST-001', name: '改判定逻辑', desc: '先跑引擎测试', note: '60 项' },
    { id: 'TEST-002', name: '改题库文案', desc: '先跑题库校验', note: '76 项' },
    { id: 'TEST-003', name: '改页面作答', desc: '先跑端到端', note: '81 项' },
  ];

  let b = shell(W, H, '01', '《破招》功能全景 · 依赖热度',
    '用户能碰到什么，底下由什么支撑 —— 改之前先数依赖次数，比凭感觉可靠',
    '<tspan font-weight="500">全景图</tspan> = 四页入口 + 五个工具模块 + 改动风险由「被依赖次数」决定，而不是凭印象判断。');

  // 分组画框
  b += group(70, 140, 690, 82, '用户可见层 · 四页入口');
  b += group(70, 252, 690, 82, '工具层 · 五个核心模块');
  b += group(70, 364, 690, 160, '依赖热度 · 改动风险');
  b += group(70, 554, 690, 82, '改动前必跑 · 三套测试门禁');

  // 页面节点
  PAGES.forEach((p, i) => {
    b += node(82 + i * 136, 156, 116, p.id, p.name, p.desc, { h: 52 });
  });

  // 工具模块节点
  MODULES.forEach((m, i) => {
    b += node(82 + i * 136, 268, 116, m.id, m.name, m.desc, { h: 52 });
  });

  // 热度条
  HEAT.forEach((m, i) => {
    b += heatBar(92, 386 + i * 26, 646, m.name, m.deps, m.risk, m.color);
  });

  // 门禁节点
  GATES.forEach((g, i) => {
    b += node(82 + i * 232, 570, 216, g.id, g.name, g.desc, { h: 52 });
  });

  // 连线：实线 = 页面调用工具；虚线 = 工具被依赖 → 进入热度统计 → 受测试门禁
  b += solid(140, 208, 140, 252);   // 单闯页 → argue-engine
  b += solid(412, 208, 412, 252);   // 训练页 → data/levels
  b += solid(548, 208, 548, 252);   // 我的页 → compliance
  b += dash(140, 320, 140, 386);    // argue-engine → 热度条 1
  b += dash(276, 320, 276, 412);    // compliance → 热度条 2
  b += dash(412, 320, 412, 438);    // data/levels → 热度条 3
  b += dash(548, 320, 548, 464);    // app.js → 热度条 4
  b += dash(672, 320, 672, 490);    // arg-framework → 热度条 5
  b += dashElbow(92, 524, 190, 554, 540);   // 热度区 → TEST-001
  b += dashElbow(470, 524, 422, 554, 540);  // 热度区 → TEST-002
  b += dashElbow(700, 524, 654, 554, 540);  // 热度区 → TEST-003

  // pill 标签
  // pill 贴在框内底部空档（节点卡底 y+52，框底 y+82），不压 ID 行也不压框名
  b += pill(88, 212, '跳转非 TabBar', 84);
  b += pill(88, 324, '判定不可降级', 84);
  b += pill(240, 324, '文案必过校验', 88);
  b += pill(392, 324, '边界代码强制', 88);
  b += pill(560, 364, '风险由依赖数决定', 108);
  b += pill(84, 620, '60 项', 60);
  b += pill(316, 620, '76 项', 60);
  b += pill(548, 620, '81 项', 60);

  // 右侧详情面板
  b += detailPanel(820, 108, 260, 264, '高风险 · RULE-005', '被依赖 6', [
    '名称： 论证推理引擎',
    '位置： argue-engine.js',
    '所属能力： CAP-001 论证拆招测评',
    '所属页面： PAGE-001 单闯页',
    '触发时机： ACT-003 提交作答',
    '保存位置： STORE-001 写入 pz_logs',
    '不可降级： C-002 真值表不可交给 AI',
    '验证路径： TEST-001 引擎测试 60 项',
  ]);

  b += noteCard(820, 386, 260, 278, '为什么要数依赖？', [
    '维度 12→15 那次改动',
    '实际炸了 7 个文件',
    '',
    '全靠逐个跑测试才发现',
    '',
    '有热度表之后，',
    '改 argue-engine 前',
    '就知道必须跑全套',
  ], [
    '经验：改高被依赖模块',
    '先跑三套测试，比事后补救快。',
  ]);

  b += legend(40, 680, 760, 70);
  b += banner(W, 758, '改一个文件前先问：它被谁依赖？ 依赖它的必须同步检查吗？');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${MARKERS}${b}</svg>`;
}

// ============ 图 02：首测答题链路 ============
function chain() {
  const W = 1120, H = 800;

  const S = [
    { id: 'PAGE-001', name: '单闯页 · 读取关卡进度', desc: 'solo.js onLoad → loadLevel', note: 'UI-001', f: '#E6F1FB', s: '#185FA5' },
    { id: 'UI-003 / UI-004', name: '卡片区 + 15 类谬误选择器', desc: '呈现前提卡与结论卡', note: 'RULE-004', f: '#E6F1FB', s: '#185FA5' },
    { id: 'ACT-001 / ACT-002', name: '选断点 + 选谬误类型', desc: '缺失则不许提交', note: 'C-003', f: '#FAEEDA', s: '#854F0B' },
    { id: 'RULE-001 / RULE-002', name: '真值表穷举 + 单题判定', desc: '形式类不走 AI 判断', note: 'C-002', f: '#FCEBEB', s: '#A32D2D' },
    { id: 'STORE-001', name: '写入 pz_logs · 纯本地', desc: '不上传，不采集', note: 'FLOW-002', f: '#E1F5EE', s: '#0F6E56' },
    { id: 'RULE-005', name: '指纹聚合 · 贝叶斯平滑', desc: 'minSamples 3 分组门槛', note: 'RULE-013', f: '#E1F5EE', s: '#0F6E56' },
    { id: 'PAGE-003 / CAP-005', name: '指纹页 + canvas 本地出图', desc: '分享不设奖励', note: 'C-004', f: '#E6F1FB', s: '#185FA5' },
  ];

  let b = shell(W, H, '02', '首测答题链路 · 7 步',
    '五关 × 3 题 = 15 题 · 首关 ≤ 90 秒 · 全流程 ≤ 4 分钟',
    '<tspan font-weight="500">链路图</tspan> = 从进入页面到出卡片的每一步，每步标注节点 ID、所受约束与保存位置。');

  // 分组画框：三段
  b += group(70, 138, 690, 204, '① 页面与交互层 · 用户操作');
  b += group(70, 366, 690, 142, '② 判定层 · 引擎工作');
  b += group(70, 532, 690, 142, '③ 数据与展示层 · 落地与出图');

  // 链路节点（h=54，行距 62）
  const YS = [150, 212, 274, 378, 440, 544, 606];
  S.forEach((n, i) => {
    b += nodeRow(88, YS[i], 430, 54, n.id, n.name, n.desc, n.note,
      { step: i + 1, fill: n.f, stroke: n.s });
  });

  // 箭头（实线=主数据流）
  b += numberedArrow(303, 204, 303, 212);
  b += numberedArrow(303, 266, 303, 274);
  b += numberedArrow(303, 328, 303, 378, '');
  b += numberedArrow(303, 432, 303, 440);
  b += numberedArrow(303, 494, 303, 544, '');
  b += numberedArrow(303, 598, 303, 606);

  // 右侧栏：每段的补充说明（虚线引出）
  // 说明卡：贴在每段框的右上角空档（框内 y+8），pill 让出 y+20 那一行
  b += `
<rect x="612" y="146" width="136" height="46" rx="6" fill="${C.panel}" stroke="${C.panelBorder}" stroke-width="0.8"/>
<text x="622" y="163" font-size="9.5" fill="${C.title}" font-family="${FONT_SANS}" font-weight="500">方向锚点</text>
<text x="622" y="179" font-size="10" fill="${C.gray}" font-family="${FONT_SANS}">向外 / 向上 / 向内</text>`;

  b += `
<rect x="612" y="374" width="136" height="46" rx="6" fill="#FCEBEB" stroke="#E4B7B7" stroke-width="0.8"/>
<text x="622" y="391" font-size="9.5" fill="#501313" font-family="${FONT_SANS}" font-weight="500">真值表穷举</text>
<text x="622" y="407" font-size="10" fill="${C.gray}" font-family="${FONT_SANS}">形式类 100% 确定</text>`;

  b += `
<rect x="612" y="540" width="136" height="46" rx="6" fill="#E1F5EE" stroke="#A9D9C8" stroke-width="0.8"/>
<text x="622" y="557" font-size="9.5" fill="#04342C" font-family="${FONT_SANS}" font-weight="500">零采集</text>
<text x="622" y="573" font-size="10" fill="${C.gray}" font-family="${FONT_SANS}">无隐私接口声明</text>`;

  // pill 标签：放在节点卡右侧空档（x=524），不压卡片也不压分组框名
  b += pill(524, 154, '纯本地无上传', 84);
  b += pill(524, 216, '15 类 chip', 72);
  b += pill(524, 278, '必答项', 64);
  b += pill(524, 382, '引擎不可降级', 88);
  b += pill(524, 444, '不上传', 60);
  b += pill(524, 548, '首测完成后', 76);
  b += pill(524, 610, '分享自愿', 72);

  // 右侧详情面板
  b += detailPanel(820, 108, 260, 264, '不可动点 · ACT-003', '可复现', [
    '名称： 提交作答',
    '位置： solo.js 的 onSubmit',
    '所属能力： CAP-001 论证拆招测评',
    '所属页面： PAGE-001 单闯页',
    '触发时机： ACT-001 与 ACT-002 之后',
    '保存位置： STORE-001 写入 pz_logs',
    '不可降级： C-003 必须用户作答',
    '验证路径： TEST-003 送答案回归检测',
  ]);

  b += noteCard(820, 386, 260, 278, '违反任一不可动点', [
    'C-002 真值表换成 AI 判断',
    '  → 形式类题可能判错',
    '',
    'C-003 谬误类型代用户选',
    '  → 用户永远答对，数据失真',
    '',
    'C-004 分享设奖励解锁',
    '  → 平台审核驳回',
  ], [
    '三条都有测试在拦：',
    'tests/e2e.test.js 边界断言。',
  ]);

  b += legend(40, 680, 760, 70);
  b += banner(W, 758, '这条链路里 ACT-003 是命门：它一处错，指纹与刻度全部失真。');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${MARKERS}${b}</svg>`;
}

// ============ 图 03：训练层三模式与 ARG 边界 ============
function training() {
  const W = 1120, H = 800;

  const MODES = [
    { id: 'RULE-013', name: '每日三题', desc: '从 77 题池按薄弱项抽', items: ['最弱分组优先', '单维薄弱项优先', '轮换题库优先', '按 qid 去重'], f: '#E1F5EE', s: '#0F6E56', fg: '#04342C', note: 'FLOW-005' },
    { id: 'RULE-007', name: '论证质量 ARG', desc: 'Govier 三标准评估', items: ['A 可接受性', 'R 相关性', 'G 充分性', '逐项独立判定'], f: '#EEEDFE', s: '#534AB7', fg: '#26215C', note: 'ACT-010' },
    { id: 'RULE-009', name: '怎么回（杠精四关）', desc: '线性通过制', items: ['① 有没有给理由', '② 理由是真的吗', '③ 理由相关吗', '④ 推理片面吗'], f: '#FBEAF0', s: '#993556', fg: '#4B1528', note: 'ACT-011' },
  ];

  let b = shell(W, H, '03', '训练层三模式 · ARG 边界',
    'PAGE-004 训练页 · 三模式切换 · 均从题池与本地日志取数',
    '<tspan font-weight="500">边界图</tspan> = ARG 只在训练层与月测出现，首测与对攻禁用 —— 这条边界由代码强制，不是约定。');

  // 三个模式框
  MODES.forEach((m, i) => {
    const y = 140 + i * 116;
    b += group(70, y, 690, 96, `模式 ${i + 1} · ${m.name}`);
    b += nodeRow(88, y + 18, 210, 56, m.id, m.name, m.desc, m.note,
      { step: i + 1, fill: m.f, stroke: m.s });
    b += bullets(320, y + 34, m.items, m.s);
  });

  // ARG 边界框
  b += group(70, 488, 690, 146, 'RULE-008 · ARG 模式边界 —— 由代码强制');
  b += `
<rect x="88" y="510" width="310" height="106" rx="7" fill="#E1F5EE" stroke="#0F6E56" stroke-width="1.2"/>
<text x="104" y="532" font-size="12.5" fill="#04342C" font-family="${FONT_SANS}" font-weight="500">ARG 启用</text>
<text x="104" y="556" font-size="10.5" fill="#0F6E56" font-family="${FONT_MONO}">train     训练层</text>
<text x="104" y="576" font-size="10.5" fill="#0F6E56" font-family="${FONT_MONO}">monthly   月测</text>
<text x="104" y="602" font-size="9.5" fill="${C.gray}" font-family="${FONT_SANS}">已有足够练习量后，再引入三维评估</text>`;

  b += `
<rect x="422" y="510" width="320" height="106" rx="7" fill="#FCEBEB" stroke="#A32D2D" stroke-width="1.2"/>
<text x="438" y="532" font-size="12.5" fill="#501313" font-family="${FONT_SANS}" font-weight="500">ARG 禁用</text>
<text x="438" y="556" font-size="10.5" fill="#A32D2D" font-family="${FONT_MONO}">solo      首测</text>
<text x="438" y="576" font-size="10.5" fill="#A32D2D" font-family="${FONT_MONO}">versus    对攻</text>
<text x="438" y="602" font-size="9.5" fill="${C.gray}" font-family="${FONT_SANS}">首测目标是让用户发现自己不知道</text>`;

  // 虚线：模式 → ARG 边界判定框（模式 3 的说明已足够，不再引出第三条）
  b += dash(140, 372, 140, 488);
  b += dash(372, 372, 372, 488);
  b += dash(672, 372, 672, 488);

  // pill 贴在框内右上角（项目符号列表右侧的空白区 x=580），不压任何文字
  b += pill(596, 148, '最弱分组优先', 92);
  b += pill(596, 264, '逐项独立判定', 88);
  b += pill(596, 380, '第 3 关双分支', 92);
  b += pill(96, 610, 'argEnabledFor()', 104);
  b += pill(600, 610, 'C-001 边界', 78);

  // 右侧详情面板
  b += detailPanel(820, 108, 260, 250, '强制手段 · RULE-008', '代码级', [
    '名称： ARG 模式边界',
    '位置： arg-framework.js argEnabledFor',
    '所属能力： CAP-004 训练层',
    '所属页面： PAGE-004 训练页',
    '触发时机： 进入任一模式时',
    '保存位置： 不落库，运行时判定',
    '不可降级： C-001 首测禁用 ARG',
    '验证路径： TEST-003 边界断言',
  ]);

  b += noteCard(820, 372, 260, 292, '为什么首测不给 ARG？', [
    'ARG 会同时增加',
    '维度数与认知负担',
    '',
    '3 分钟首测会超载',
    '',
    '首测的任务是',
    '「让你发现自己不知道」',
    '不是「教会你框架」',
  ], [
    '所以它只在训练层与月测出现，',
    '首测保持 15 维单选。',
  ]);

  b += legend(40, 680, 760, 70);
  b += banner(W, 758, '约束不是一句话：每条都要有一个测试在拦它，否则只是愿望。');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${MARKERS}${b}</svg>`;
}

// ============ 图 04：完整复刻版（对齐原图五要素）============
function replica() {
  const W = 1120, H = 800;

  let b = `<rect width="${W}" height="${H}" fill="${C.bg}"/>`;

  // ---- 标题区 ----
  b += `
<text x="40" y="34" font-size="20" fill="#0B3B34" font-family="${FONT_SANS}" font-weight="500">《破招》功能逻辑地图</text>
<text x="40" y="54" font-size="11" fill="#0B3B34" opacity="0.75" font-family="${FONT_SANS}">用一套编号体系整理成 Markdown 关系图 —— 让 AI 看懂每个功能的上下游关系</text>
<text x="1080" y="34" font-size="11" fill="#0B3B34" opacity="0.6" text-anchor="end" font-family="${FONT_MONO}">05 / 05</text>`;

  // ---- 顶部说明条 ----
  b += `
<rect x="40" y="70" width="1040" height="28" rx="4" fill="${C.panel}" opacity="0.92"/>
<text x="56" y="88" font-size="11" fill="#0B3B34" font-family="${FONT_SANS}" dominant-baseline="central"><tspan font-weight="500">逻辑地图</tspan> = 把小程序里的能力、页面、按钮、动作、流程、数据、接口、规则、测试，用一套编号体系整理成 Markdown 关系图。</text>`;

  // ---- 主图区背景 ----
  b += `<rect x="40" y="108" width="760" height="570" rx="4" fill="#DDF7F0" opacity="0.6" stroke="${C.groupStroke}" stroke-width="0.8" stroke-dasharray="5 4"/>`;

  // ================= 分组画框（各层留出足够行间距） =================
  b += group(70, 150, 190, 78, '入口层');
  b += group(280, 150, 480, 78, '页面层');
  b += group(70, 258, 690, 78, '交互层');
  b += group(70, 366, 690, 78, '判定层');
  b += group(70, 474, 330, 78, '数据层');
  b += group(430, 474, 330, 78, '服务层');
  b += group(70, 582, 690, 78, '验证层');

  // ================= 节点（严格按层 y 坐标，不越框） =================
  // 入口层
  b += node(88, 164, 154, 'CAP-001', '论证拆招测评', '用户完成什么');

  // 页面层
  b += node(296, 164, 140, 'PAGE-001', '单闯页', '五关叙事拆招');
  b += node(452, 164, 140, 'PAGE-003', '指纹页', '三组表现');
  b += node(608, 164, 136, 'PAGE-004', '训练页', '三模式');

  // 交互层
  b += node(88, 272, 150, 'UI-003', '卡片区', '前提与结论');
  b += node(254, 272, 150, 'UI-004', '谬误选择', '15 类 chip');
  b += node(420, 272, 150, 'ACT-001', '选断点', '点卡片');
  b += node(586, 272, 158, 'ACT-002', '选谬误类型', '挑一个类型');

  // 判定层
  b += node(88, 380, 150, 'ACT-003', '提交作答', '合并两个选择');
  b += node(254, 380, 150, 'RULE-001', '真值表', '形式类穷举');
  b += node(420, 380, 150, 'RULE-002', '单题判定', '比对断点类型');
  b += node(586, 380, 158, 'RULE-005', '指纹聚合', '贝叶斯平滑');

  // 数据层
  b += node(88, 488, 140, 'STORE-001', '答题日志', 'pz_logs');
  b += node(244, 488, 140, 'FLOW-005', '每日抽题', '薄弱优先');

  // 服务层
  b += node(448, 488, 140, 'API-001', '匿名标识', '不用 openid');
  b += node(604, 488, 140, 'API-003', '建房间', '对攻用');

  // 验证层
  b += node(88, 596, 140, 'TEST-001', '引擎测试', '60 项');
  b += node(244, 596, 140, 'TEST-002', '题库校验', '76 项');
  b += node(400, 596, 140, 'TEST-003', '端到端', '81 项');
  b += node(556, 596, 156, 'RULE-011', '合规过滤', '40+ 禁用词');

  // ================= 连线（实线=主数据流，虚线=跨层约束） =================
  // 入口 → 页面
  b += solid(242, 190, 296, 190);
  b += solid(436, 190, 452, 190);
  b += solid(592, 190, 608, 190);

  // 页面 → 交互（正交折线，走框间空隙，不穿节点）
  b += elbow(366, 216, 163, 272, 245);
  b += elbow(522, 216, 329, 272, 245);
  b += elbow(676, 216, 495, 272, 245);

  // 交互层横向
  b += solid(238, 298, 254, 298);
  b += solid(404, 298, 420, 298);
  b += solid(570, 298, 586, 298);

  // 交互 → 判定（纵向实线）
  b += solid(163, 324, 163, 380);
  b += solid(329, 324, 329, 380);
  b += solid(495, 324, 495, 380);
  b += solid(665, 324, 665, 380);

  // 判定层横向
  b += solid(238, 406, 254, 406);
  b += solid(404, 406, 420, 406);
  b += solid(570, 406, 586, 406);

  // 判定 → 数据/服务（虚线跨层）
  b += dashElbow(163, 432, 158, 488, 460);
  b += dashElbow(495, 432, 314, 488, 460);
  b += dashElbow(495, 432, 518, 488, 460);
  b += dashElbow(665, 432, 674, 488, 460);

  // 数据/服务 → 验证（虚线）
  b += dashElbow(158, 540, 158, 596, 570);
  b += dashElbow(518, 540, 470, 596, 570);
  b += dashElbow(634, 540, 634, 596, 570);

  // ================= pill 标签 =================
  // 放在分组框之间的 30px 空隙里（框底 y=228 → 下一框顶 y=258）
  // pill 统一贴在上一框的框内底部（y = 框底 - 24），绝不压下一框的框名
  b += pill(82, 210, '前端交互', 74);      // 入口/页面层框内底部
  b += pill(330, 210, '三页并列', 74);
  b += pill(560, 210, '双人同题', 76);
  b += pill(82, 318, '答完即判', 74);      // 交互层框内底部
  b += pill(82, 426, '数据落地本地', 92);  // 判定层框内底部
  b += pill(446, 426, '云端但匿名', 84);
  b += pill(82, 534, '60+76+81', 84);      // 数据/服务层框内底部
  b += pill(640, 642, '不可降级', 74);     // 验证层框内底部

  // ================= 右侧详情面板 =================
  b += detailPanel(820, 108, 260, 250, 'A 报错 · ACT-003', '可复现', [
    '名称： 提交作答',
    '位置： solo.js 的 onSubmit',
    '所属能力： CAP-001 论证拆招测评',
    '所属页面： PAGE-001 单闯页',
    '触发时机： ACT-001 与 ACT-002 之后',
    '保存位置： STORE-001 写入 pz_logs',
    '不可降级： C-003 必须用户作答',
    '验证路径： TEST-003 送答案回归检测',
  ]);

  b += noteCard(820, 372, 260, 292, '看到了吗？', [
    '编号 · 独立 ID（橙色 ACT-003）',
    'Markdown 说明：位置精确到函数名',
    '靠测试节点兜底（实践）/ 引用（继续）',
  ], [
    '这就是逻辑地图：',
    '一张 AI 能读、脏活、需验证的产品关系网。',
  ]);

  // ================= 底部图例 =================
  b += legend(40, 692, 760, 78);

  // ================= 底部横幅 =================
  b += `
<rect x="40" y="760" width="1040" height="30" rx="4" fill="${C.panel}" opacity="0.92"/>
<text x="560" y="779" font-size="13" fill="#0B3B34" text-anchor="middle" font-family="${FONT_SANS}" font-weight="500" dominant-baseline="central">让 AI 改代码前先回答：改什么？ 影响哪里？ 不能动什么？ 怎么验证？</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${MARKERS}${b}</svg>`;
}

// ============ 输出 ============
const outputs = [
  ['01-overview.svg', overview()],
  ['02-chain.svg', chain()],
  ['03-training.svg', training()],
  ['04-replica.svg', replica()],
];

console.log('\n═══ 生成功能地图视图 ═══\n');
for (const [name, content] of outputs) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, content, 'utf-8');
  console.log(`  ✓ ${name.padEnd(20)} ${content.length} 字节`);
}

// ============ 一致性自检 ============
const MAP_FILE = path.resolve(__dirname, '..', 'docs', 'feature-map.md');
if (fs.existsSync(MAP_FILE)) {
  const mapMd = fs.readFileSync(MAP_FILE, 'utf-8');
  const allSvg = outputs.map(o => o[1]).join('\n');
  const usedIds = [...new Set(allSvg.match(/\b(?:CAP|PAGE|UI|ACT|FLOW|API|STORE|RULE|TEST)-\d{3}\b/g) || [])];
  const mapIds = new Set(
    [...mapMd.matchAll(/\b((?:CAP|PAGE|UI|ACT|FLOW|API|STORE|RULE|TEST)-\d{3})\b/g)].map(m => m[1])
  );
  const orphan = usedIds.filter(id => !mapIds.has(id));

  console.log('─── 一致性自检 ───\n');
  if (orphan.length === 0) {
    console.log(`  ✓ 图中 ${usedIds.length} 个节点 ID 均存在于 feature-map.md`);
  } else {
    console.log(`  ✗ 图中有 ${orphan.length} 个 ID 不在地图里：${orphan.join(', ')}`);
  }
  const uncovered = [...mapIds].filter(id => !usedIds.includes(id));
  console.log(`  · 地图中另有 ${uncovered.length} 个节点未在图中出现（详表里可查）`);
}

console.log(`\n输出目录：${OUT}\n`);
console.log('提示：图与 feature-map.md 同源。改了节点定义请重新生成。\n');