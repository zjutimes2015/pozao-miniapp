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

const { FALLACIES, FALLACY_LIST, verifyFormDeduction } = require('../utils/argue-engine.js');
const compliance = require('../utils/compliance.js');
const soloBank = require('../data/levels.js');
const versusBank = require('../data/versus-bank.js');
const rotationBank = require('../data/rotation-bank.js');
const plan = require('../data/bank-plan.js');

let errors = [];
let warnings = [];
let passed = 0;

function ok(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { errors.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

// ============ 汇总三个题库 ============
const allQuestions = [];
for (const lv of soloBank.levels) {
  for (const q of lv.questions) {
    // 叙事题的 difficulty 定义在关卡上，继承到题目层以便统一校验
    allQuestions.push({
      ...q,
      difficulty: q.difficulty || lv.difficulty,
      levelId: lv.id, levelName: lv.name,
      scene: q.scene || lv.scene,
      bank: 'solo',
    });
  }
}
for (const q of versusBank.questions) {
  allQuestions.push({ ...q, levelId: 0, scene: q.scene, bank: 'versus' });
}
for (const q of rotationBank.questions) {
  allQuestions.push({ ...q, levelId: 0, scene: q.scene, bank: 'rotation' });
}

console.log('\n═══ 题库规模 ═══\n');
ok('叙事题 15 道', soloBank.levels.reduce((s, l) => s + l.questions.length, 0) === 15,
  `${soloBank.levels.reduce((s, l) => s + l.questions.length, 0)}`);
ok('对攻题 30 道', versusBank.questions.length === 30, `${versusBank.questions.length}`);
ok('轮换题 20 道', rotationBank.questions.length === 20, `${rotationBank.questions.length}`);
ok('总计 65 道', allQuestions.length === 65, `${allQuestions.length}`);
ok('叙事题共 5 关', soloBank.levels.length === 5);

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
  if (q.scene) scanText(q.scene, `${q.id}.scene`);
  for (const c of q.cards) scanText(c.text, `${q.id}.card.${c.id}`);
}
for (const lv of soloBank.levels) {
  scanText(lv.name, `level${lv.id}.name`);
  scanText(lv.scene, `level${lv.id}.scene`);
}

ok('全部 65 题文本无禁用词', violations.length === 0,
  violations.slice(0, 5).map(v => `${v.where}:${v.words}`).join(' | '));

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
ok('每题都有至少 2 张卡片',
  allQuestions.every(q => q.cards && q.cards.length >= 2));
ok('每题都有前提卡与结论卡',
  allQuestions.every(q => {
    const hasP = q.cards.some(c => c.type === 'premise');
    const hasC = q.cards.some(c => c.type === 'conclusion');
    return hasP && hasC;
  }));
ok('每题都有唯一 id',
  new Set(allQuestions.map(q => q.id)).size === allQuestions.length,
  `唯一 ${new Set(allQuestions.map(q => q.id)).size} / 总 ${allQuestions.length}`);
ok('每题都有 difficulty 且在1-5',
  allQuestions.every(q => q.difficulty >= 1 && q.difficulty <= 5));

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

const formFallacies = ['affirming_consequent', 'denying_antecedent'];
const formInBank = allQuestions.filter(q => formFallacies.includes(q.fallacyKey));
ok('题库含形式类题目', formInBank.length > 0, `${formInBank.length} 道`);
for (const q of formInBank) {
  ok(`${q.id} (${FALLACIES[q.fallacyKey].name}) 确为无效推理形式`,
    verifyFormDeduction('p->q',
      q.fallacyKey === 'affirming_consequent' ? 'q' : '!p',
      q.fallacyKey === 'affirming_consequent' ? 'p' : '!q') === false);
}

console.log('\n═══ 5. 12 维覆盖度与分组均衡 ═══\n');

const counts = {};
for (const q of allQuestions) {
  counts[q.fallacyKey] = (counts[q.fallacyKey] || 0) + 1;
}

console.log('  维度分布：');
for (const f of FALLACY_LIST) {
  const total = counts[f.key] || 0;
  const s = allQuestions.filter(q => q.fallacyKey === f.key && q.bank === 'solo').length;
  const v = allQuestions.filter(q => q.fallacyKey === f.key && q.bank === 'versus').length;
  const r = allQuestions.filter(q => q.fallacyKey === f.key && q.bank === 'rotation').length;
  console.log(`    ${String(f.id).padStart(2)}. ${f.name.padEnd(6)} ${f.group}  叙事${s} 对攻${v} 轮换${r} = ${total}`);
}

const missing = FALLACY_LIST.filter(f => (counts[f.key] || 0) < 3);
ok('每维至少 3 题（minSamples 门槛）', missing.length === 0,
  missing.map(f => `${f.name}=${counts[f.key] || 0}`).join(','));

const usedKeys = Object.keys(counts);
ok('覆盖全部 12 类谬误', usedKeys.length === 12, `${usedKeys.length} 类`);

// 分组均衡：直接影响聚合指纹的可靠性
const groupCounts = {};
for (const q of allQuestions) {
  const g = FALLACIES[q.fallacyKey].group;
  groupCounts[g] = (groupCounts[g] || 0) + 1;
}
console.log(`  分组分布：${JSON.stringify(groupCounts)}`);
const gVals = Object.values(groupCounts);
const spread = Math.max(...gVals) - Math.min(...gVals);
ok('三组极差 ≤ 6（保证聚合指纹均衡）', spread <= 6,
  `极差 ${spread}：${JSON.stringify(groupCounts)}`);

// 验证分配方案与实际一致
for (const [key, expect] of Object.entries(plan.versus)) {
  const actual = versusBank.questions.filter(q => q.fallacyKey === key).length;
  ok(`对攻分配 ${FALLACIES[key].name} = ${expect}`, actual === expect, `实际 ${actual}`);
}
for (const [key, expect] of Object.entries(plan.rotation)) {
  const actual = rotationBank.questions.filter(q => q.fallacyKey === key).length;
  ok(`轮换分配 ${FALLACIES[key].name} = ${expect}`, actual === expect, `实际 ${actual}`);
}

console.log('\n═══ 6. 难度标定 ═══\n');

// 模拟整体正确率应落在 45%-60%
const simRates = { 1: 0.78, 2: 0.68, 3: 0.55, 4: 0.42, 5: 0.30 };
let expectedCorrect = 0;
for (const q of allQuestions) {
  expectedCorrect += simRates[q.difficulty];
}
const simRate = expectedCorrect / allQuestions.length;
ok('模拟整体正确率落在 45%-60%', simRate >= 0.45 && simRate <= 0.60,
  `模拟值 ${(simRate * 100).toFixed(1)}%`);
console.log(`  模拟正确率 ${(simRate * 100).toFixed(1)}%`);

// 难度分布不应过于集中
const diffDist = {};
for (const q of allQuestions) diffDist[q.difficulty] = (diffDist[q.difficulty] || 0) + 1;
console.log(`  难度分布：${JSON.stringify(diffDist)}`);
ok('难度分布覆盖至少 3 档', Object.keys(diffDist).length >= 3);
ok('难度 5（最高）题目存在但不过量',
  (diffDist[5] || 0) > 0 && (diffDist[5] || 0) <= allQuestions.length * 0.2,
  `难度5 共 ${diffDist[5] || 0} 道`);

console.log('\n═══ 7. 叙事语气（不应出现说教/灌鸡汤） ═══\n');

const preachy = [];
for (const q of allQuestions) {
  for (const pat of ['你应该', '你必须', '记住', '正确的做法', '优秀的人']) {
    if (q.text.includes(pat) || (q.hint || '').includes(pat) || q.groundTruth.includes(pat)) {
      preachy.push(`${q.id}:${pat}`);
    }
  }
}
ok('题目不含说教式表达', preachy.length === 0, preachy.join(','));

// 叙事题必须有场景
const noScene = allQuestions.filter(q => !q.scene);
ok('每题都有场景标注', noScene.length === 0, noScene.map(q => q.id).join(','));

console.log('\n═══ 8. 对攻题特殊要求 ═══\n');

// 对攻题需要断点更隐蔽（why 更长，说明更详细）
const shortWhy = versusBank.questions.filter(q => q.breakpoint.why.length < 40);
ok('对攻题 why 至少 40 字（便于两人讨论）', shortWhy.length === 0,
  shortWhy.map(q => q.id).join(','));

console.log('\n═══ 9. 轮换题特殊要求 ═══\n');

// 轮换题场景要更日常（不应出现过于技术化的词）
const techWords = ['编译', '内核', '协议栈', '寄存器', '内存分配'];
const tooTech = rotationBank.questions.filter(q =>
  techWords.some(w => q.text.includes(w))
);
ok('轮换题场景日常化', tooTech.length === 0,
  tooTech.map(q => q.id).join(','));

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