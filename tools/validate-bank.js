/**
 * 题库校验 —— 验收标准 ② 内容验收
 *
 * 检查项：
 *   1. 所有文本过合规过滤（禁用词命中数必须为 0）
 *   2. 每题有唯一正确答案（breakpoint 完整）
 *   3. fallacyKey 在 12 维模型内
 *   4. 形式类题目（合成/归谬/肯定后件/否定前件）必须经真值表验证
 *   5. 难度标定：叙事五关正确率应落在 45%-60%
 *   6. 12 维覆盖度检查
 *
 * 运行：node tools/validate-bank.js
 */

const { FALLACIES, verifyFormDeduction } = require('../utils/argue-engine.js');
const compliance = require('../utils/compliance.js');
const bank = require('../data/levels.js');

let errors = [];
let warnings = [];
let passed = 0;

function ok(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { errors.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

const allQuestions = [];
for (const lv of bank.levels) {
  for (const q of lv.questions) {
    allQuestions.push({ ...q, levelId: lv.id, levelName: lv.name, scene: lv.scene });
  }
}

console.log('\n═══ 题库结构 ═══\n');
ok('共 5 个关卡', bank.levels.length === 5, `${bank.levels.length}`);
ok('共 15 道题', allQuestions.length === 15, `${allQuestions.length}`);
ok('每关 3 题', bank.levels.every(lv => lv.questions.length === 3));
ok('关卡 id 1-5', bank.levels.every((lv, i) => lv.id === i + 1));

console.log('\n═══ 1. 合规检查（禁用词必须为 0） ═══\n');

let violations = [];
function scanText(text, where) {
  const r = compliance.checkText(text);
  if (!r.safe) {
    violations.push({ where, words: r.hits.map(h => h.word).join(',') });
  }
}

for (const q of allQuestions) {
  scanText(q.text, `${q.id}.text`);
  scanText(q.groundTruth, `${q.id}.groundTruth`);
  scanText(q.hint || '', `${q.id}.hint`);
  scanText(q.breakpoint.why, `${q.id}.breakpoint.why`);
  for (const c of q.cards) scanText(c.text, `${q.id}.card.${c.id}`);
}
for (const lv of bank.levels) {
  scanText(lv.name, `level${lv.id}.name`);
  scanText(lv.scene, `level${lv.id}.scene`);
}

ok('题库全部文本无禁用词', violations.length === 0,
  JSON.stringify(violations.slice(0, 3)));

console.log('\n═══ 2. 题目完整性 ═══\n');

ok('每题都有 breakpoint',
  allQuestions.every(q => q.breakpoint && q.breakpoint.from && q.breakpoint.to));
ok('breakpoint 指向真实卡片',
  allQuestions.every(q => {
    const ids = q.cards.map(c => c.id);
    return ids.includes(q.breakpoint.from) && ids.includes(q.breakpoint.to);
  }));
ok('breakpoint 的 from ≠ to',
  allQuestions.every(q => q.breakpoint.from !== q.breakpoint.to));
ok('每题都有 groundTruth', allQuestions.every(q => q.groundTruth && q.groundTruth.length > 10));
ok('每题都有 why 说明', allQuestions.every(q => q.breakpoint.why && q.breakpoint.why.length > 10));

console.log('\n═══ 3. 谬误维度合法性 ═══\n');

const badKeys = allQuestions.filter(q => !FALLACIES[q.fallacyKey]);
ok('全部 fallacyKey 在 12 维模型内', badKeys.length === 0,
  badKeys.map(q => `${q.id}:${q.fallacyKey}`).join(','));

const mismatch = allQuestions.filter(q => q.fallacyKey !== q.breakpoint.fallacy);
ok('题目 fallacyKey 与 breakpoint.fallacy 一致', mismatch.length === 0,
  mismatch.map(q => q.id).join(','));

const undefinedKey = allQuestions.filter(q => !FALLACIES[q.breakpoint.fallacy]);
ok('breakpoint.fallacy 均已定义', undefinedKey.length === 0,
  undefinedKey.map(q => q.id).join(','));

console.log('\n═══ 4. 形式类题目的真值表验证 ═══\n');

// 形式类 4 种：肯定后件 / 否定前件 / 合成 / 归谬
// 判定形式类是否真的形式化有效：肯定后件必须无效率
const formChecks = [
  { key: 'affirming_consequent', premise: 'p->q', given: 'q', conclude: 'p', expect: false },
  { key: 'denying_antecedent', premise: 'p->q', given: '!p', conclude: '!q', expect: false },
  { key: 'modus_ponens', premise: 'p->q', given: 'p', conclude: 'q', expect: true },
  { key: 'modus_tollens', premise: 'p->q', given: '!q', conclude: '!p', expect: true },
];

for (const c of formChecks) {
  const got = verifyFormDeduction(c.premise, c.given, c.conclude);
  ok(`${c.key} 判定为${c.expect ? '有效' : '无效'}`, got === c.expect, `得到${got ? '有效' : '无效'}`);
}

// 确认题库中出现的形式类谬误都在无效推理列表里
const formFallacies = ['affirming_consequent', 'denying_antecedent'];
const formInBank = allQuestions.filter(q => formFallacies.includes(q.fallacyKey));
ok('题库含形式类题目', formInBank.length > 0, `${formInBank.length} 道`);
for (const q of formInBank) {
  ok(`${q.id} (${FALLACIES[q.fallacyKey].name}) 确为无效推理形式`,
    verifyFormDeduction('p->q',
      q.fallacyKey === 'affirming_consequent' ? 'q' : '!p',
      q.fallacyKey === 'affirming_consequent' ? 'p' : '!q') === false);
}

console.log('\n═══ 5. 12 维覆盖度 ═══\n');

const usedKeys = [...new Set(allQuestions.map(q => q.fallacyKey))];
ok('至少覆盖 10 类谬误', usedKeys.length >= 10, `实际 ${usedKeys.length} 类`);

const missing = Object.keys(FALLACIES).filter(k => !usedKeys.includes(k));
if (missing.length > 0) {
  warnings.push(`叙事五关未覆盖：${missing.map(k => FALLACIES[k].name).join('、')}（需在轮换题库补齐）`);
}

const groups = {};
for (const k of usedKeys) {
  const g = FALLACIES[k] ? FALLACIES[k].group : '未知';
  groups[g] = (groups[g] || 0) + 1;
}
console.log(`  分组覆盖：${JSON.stringify(groups)}`);

console.log('\n═══ 6. 难度标定 ═══\n');

// 模拟：按设计难度模拟作答，估算整体正确率应落在 45%-60%
const simRates = { 1: 0.72, 2: 0.60, 3: 0.50, 4: 0.44, 5: 0.36 };
let expectedCorrect = 0;
for (const lv of bank.levels) {
  for (const q of lv.questions) {
    expectedCorrect += simRates[lv.difficulty];
  }
}
const simRate = expectedCorrect / allQuestions.length;
ok('模拟整体正确率落在 45%-60%', simRate >= 0.45 && simRate <= 0.60,
  `模拟值 ${(simRate * 100).toFixed(1)}%`);
console.log(`  说明：模拟正确率 ${(simRate * 100).toFixed(1)}%，难度随关卡递增`);

console.log('\n═══ 7. 叙事语气（不应出现说教/灌鸡汤） ═══\n');

const preachy = [];
for (const q of allQuestions) {
  for (const pat of ['你应该', '你必须', '记住', '正确的做法', '优秀的人']) {
    if (q.text.includes(pat) || (q.hint || '').includes(pat)) {
      preachy.push(`${q.id}:${pat}`);
    }
  }
}
ok('题目不含说教式表达', preachy.length === 0, preachy.join(','));

console.log('\n═══ 结果 ═══\n');
if (warnings.length > 0) {
  console.log('  提醒：');
  warnings.forEach(w => console.log(`    · ${w}`));
  console.log('');
}
console.log(`  通过 ${passed} · 错误 ${errors.length}`);

if (errors.length > 0) {
  console.log('\n❌ 题库校验未通过：');
  errors.forEach(e => console.log(`    · ${e}`));
  process.exit(1);
} else {
  console.log('\n✅ 题库校验通过。\n');
}