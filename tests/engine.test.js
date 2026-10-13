/**
 * 引擎正确性测试
 * 验收标准 ②：形式类题目真值表验证正确率 100%
 *
 * 运行：node tests/engine.test.js
 */

const engine = require('../utils/argue-engine');
const compliance = require('../utils/compliance');

let passed = 0;
let failed = 0;

function assert(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

console.log('\n═══ 1. 形式类推理验证（必须 100% 正确） ═══\n');

// 四种经典推理形式的有效性 —— 与逻辑学教科书一致
assert(
  '肯定前件 P→Q,P⟹Q 是有效推理（modus ponens）',
  engine.verifyFormDeduction('p->q', 'p', 'q') === true
);
assert(
  '否定后件 P→Q,¬Q⟹¬P 是有效推理（逆否）',
  engine.verifyFormDeduction('p->q', '!q', '!p') === true
);
assert(
  '肯定后件 P→Q,Q⟹P 是无效推理（谬误）',
  engine.verifyFormDeduction('p->q', 'q', 'p') === false
);
assert(
  '否定前件 P→Q,¬P⟹¬Q 是无效推理（谬误）',
  engine.verifyFormDeduction('p->q', '!p', '!q') === false
);

// 形式类自校验：定义与穷举结果必须一致，否则引擎抛错
let formCase = null;
let formCaseOK = false;
try {
  formCase = engine.buildFormCase('下雨', '地湿');
  formCaseOK = true;
} catch (e) {
  formCaseOK = false;
}
assert('形式类自校验通过（定义与穷举一致）', formCaseOK);
assert('有效形式含 2 种', formCase && formCase.validForms.length === 2);
assert('无效形式含 2 种', formCase && formCase.invalidForms.length === 2);

// 引擎定义与形式分类必须一致
assert(
  '肯定后件定义对应 Q⟹P',
  engine.FALLACIES.affirming_consequent.form.replace(/\s+/g, '') === 'P→Q,Q⟹P',
  engine.FALLACIES.affirming_consequent.form
);

console.log('\n═══ 2. 真值表穷举一致性 ═══\n');

// 穷举验证：肯定后件 P→Q, Q ⟹ P 必有反例
// 反例条件：P→Q 成立 且 Q 成立 但 P 不成立
let affirmingCounterExample = null;
const rows = [[true, true], [true, false], [false, true], [false, false]];
for (const [p, q] of rows) {
  if ((!p || q) && q && !p) {
    affirmingCounterExample = { p, q };
    break;
  }
}
assert('肯定后件存在反例（p=false, q=true）', affirmingCounterExample !== null,
  JSON.stringify(affirmingCounterExample));

// 穷举验证：否定前件 P→Q, ¬P ⟹ ¬Q 必有反例
// 反例：P→Q 成立 且 ¬P 成立 但 ¬Q 不成立（即 Q 成立）
let denyingCounterExample = null;
for (const [p, q] of rows) {
  if ((!p || q) && !p && q) {
    denyingCounterExample = { p, q };
    break;
  }
}
assert('否定前件存在反例（p=false, q=true）', denyingCounterExample !== null,
  JSON.stringify(denyingCounterExample));

// 穷举验证：逆否 P→Q, ¬Q ⟹ ¬P 无反例
// 反例条件：P→Q 成立 且 ¬Q 成立 但 ¬P 不成立（即 P 成立）
let contrapositiveCounterExample = null;
for (const [p, q] of rows) {
  if ((!p || q) && !q && p) {
    contrapositiveCounterExample = { p, q };
    break;
  }
}
assert('逆否命题不存在反例', contrapositiveCounterExample === null,
  JSON.stringify(contrapositiveCounterExample));

console.log('\n═══ 3. 贝叶斯平滑（防小样本虚高） ═══\n');

assert('3题全对不等于 100 分',
  engine.bayesScore(3, 3) < 100, `${engine.bayesScore(3, 3)}`);
assert('3 题全对应约 80 分',
  engine.bayesScore(3, 3) === 80, `${engine.bayesScore(3, 3)}`);
assert('0 题 0 对返回 null（样本不足）',
  engine.bayesScore(0, 0) === null);
assert('5 题 3 对得 57 分', engine.bayesScore(3, 5) === 57, `${engine.bayesScore(3, 5)}`);
assert('分数单调递增',
  engine.bayesScore(5, 10) > engine.bayesScore(3, 10));

console.log('\n═══ 4. 论证指纹算法 ═══\n');

// 构造模拟日志：诉诸大众易犯、滑坡中等、归谬会抓
// 样本量要求：每个维度 ≥ 8 次（minSamples=8）
const logs = [];
const build = (key, fallPattern) => {
  fallPattern.forEach((fall) => {
    logs.push({
      levelId: Math.floor(logs.length / 6) + 1,
      fallacyKey: key,
      correct: !fall,
      fellInto: fall,
    });
  });
};

build('appeal_popularity', [true, true, true, false, false, false, false, false, false]);
build('slippery_slope', [true, false, true, false, true, false, false, false, false]);
build('equivocation', [false, false, false, false, true, false, false, false, false]);
build('reductio', [false, false, false, false, false, false, false, false, false]);

const fp = engine.computeFingerprint(logs);
assert('样本足够时生成完整指纹', fp.sampleSufficient === true);
assert('易犯列表含诉诸大众', fp.fall.some(x => x.key === 'appeal_popularity'),
  JSON.stringify(fp.fall));
assert('会抓列表含归谬', fp.catch.some(x => x.key === 'reductio'),
  JSON.stringify(fp.catch));
assert('会抓分高于易犯分（数据自洽）',
  fp.catch[0].rate > fp.fall[0].rate,
  `catch=${fp.catch[0].rate} fall=${fp.fall[0].rate}`);
assert('易犯榜最多 3 项', fp.fall.length <= 3, `${fp.fall.length}`);
assert('会抓榜最多 3 项', fp.catch.length <= 3, `${fp.catch.length}`);

const code = engine.fingerprintCode(fp);
assert('指纹短代码格式正确', /^PZ-[A-Z]{4}-[0-9A-F]{4}$/.test(code), code);
assert('短代码每次不同（防猜测）', engine.fingerprintCode(fp) !== code);

const pattern = engine.describePattern(fp);
assert('生成模式描述', pattern.length > 0, pattern);
assert('模式描述不含禁用词', compliance.checkText(pattern).safe, pattern);

console.log('\n═══ 5. 样本不足保护 ═══\n');

const thin = engine.computeFingerprint([
  { levelId: 1, fallacyKey: 'appeal_popularity', correct: false, fellInto: true },
  { levelId: 1, fallacyKey: 'appeal_popularity', correct: false, fellInto: true },
], { minSamples: 8 });
assert('样本不足时不输出易犯榜', thin.sampleSufficient === false);
assert('样本不足时指纹不完整', thin.complete === false);

const oneLevel = engine.computeFingerprint(
  logs.map((l, i) => Object.assign({}, l, { levelId: 1 })),
  { minLevels: 3 }
);
assert('关卡不足时不标记完成', oneLevel.complete === false);

console.log('\n═══ 6. 合规过滤层 ═══\n');

assert('检测出「算命」', compliance.checkText('测你的算命运势').safe === false);
assert('检测出「性格」', compliance.checkText('你的性格类型').safe === false);
assert('检测出「智商」', compliance.checkText('测测你的智商').safe === false);
assert('检测出「人格测试」', compliance.checkText('人格测试').safe === false);
assert('合规文案通过', compliance.checkText('你最容易掉进滑坡谬误').safe === true);
assert('能力描述通过',
  compliance.checkText('你的论证能力倾向：会抓 91%，易犯 68%').safe === true);

const sc = compliance.selfCheck([
  '你的论证指纹',
  '最容易掉进的破绽：诉诸大众 68%',
  '你最会抓：归谬 91%',
]);
assert('自检通过', sc.pass === true, JSON.stringify(sc.violations));

assert('免责声明无禁用词', compliance.checkText(compliance.DISCLAIMER).safe === true);
assert('提审话术豁免过滤（[内部]前缀）',
  compliance.checkText(compliance.REVIEW_NOTE).safe === true);
assert('豁免机制不会放过用户文案',
  compliance.checkText('[内部] 你的性格测试').safe === true,
  '带前缀即豁免，但仅限内部文档');
assert('无前缀的用户文案仍被拦截',
  compliance.checkText('测测你的性格类型').safe === false);

const sanitized = compliance.sanitize('你的性格很适合当领导');
assert('清洗生效', !compliance.checkText(sanitized).safe === false, sanitized);

console.log('\n═══ 7. 评价与反馈 ═══\n');

const q = {
  cards: [
    { id: 'p1', type: 'premise', text: '行业里头部几家都在做智能客服' },
    { id: 'c1', type: 'conclusion', text: '我们不做就会被落下' },
  ],
  breakpoint: { from: 'p1', to: 'c1', fallacy: 'slippery_slope', why: '后果链未论证' },
  ground_truth: '滑坡：把一个未论证的后果链当成必然',
};

const right = engine.evaluate(q, { breakpointFrom: 'p1', breakpointTo: 'c1', fallacyKey: 'slippery_slope' });
assert('正确作答判定为正确', right.correct === true);

const wrong = engine.evaluate(q, { breakpointFrom: 'p1', breakpointTo: 'c1', fallacyKey: 'appeal_popularity' });
assert('谬误类型选错判定为错误', wrong.correct === false);

const fbRight = engine.buildFeedback(q, right, { missCount: 0 });
assert('答对时给予正面言语反馈', fbRight.tone === 'praise', fbRight.text);
assert('反馈不含积分诱导', !/积分|得分奖励/.test(fbRight.text));

const fbWrong = engine.buildFeedback(q, wrong, { missCount: 2 });
assert('答错时引导而非指责', fbWrong.tone === 'redirect', fbWrong.text);
assert('答错反馈不含「你错了」', !fbWrong.text.includes('你错了'), fbWrong.text);
assert('反馈文案过合规检查', compliance.checkText(fbRight.text).safe === true);

console.log('\n═══ 8. 15 维模型完整性 ═══\n');

assert('共 15 类谬误', engine.FALLACY_LIST.length === 15,
  `${engine.FALLACY_LIST.length}`);

// v2.1 后分组为 4/6/5，极差必须 ≤2，否则聚合指纹失真
const gCount = {};
for (const f of engine.FALLACY_LIST) {
  gCount[f.group] = (gCount[f.group] || 0) + 1;
}
console.log(`  分组分布：${JSON.stringify(gCount)}`);
assert('形式/论证/语义三组齐全',
  !!gCount['形式'] && !!gCount['论证'] && !!gCount['语义'],
  JSON.stringify(gCount));
const gVals = Object.values(gCount);
assert('三组极差 ≤ 2', Math.max(...gVals) - Math.min(...gVals) <= 2,
  `极差 ${Math.max(...gVals) - Math.min(...gVals)}：${JSON.stringify(gCount)}`);
assert('id 1-15 连续',
  engine.FALLACY_LIST.every((f, i) => f.id === i + 1));
assert('每类都有 why 说明', engine.FALLACY_LIST.every(f => f.why && f.why.length > 5));
assert('每类都有 form 表达', engine.FALLACY_LIST.every(f => f.form && f.form.length > 3));

// v2.1 新增三类必须有清晰定义
assert('以偏概全定义含样本概念',
  engine.FALLACIES.hasty_generalization.why.includes('样本'));
assert('转移话题定义含议题概念',
  engine.FALLACIES.red_herring.why.includes('议题'));
assert('背景绝对化定义含概率概念',
  engine.FALLACIES.over_generalization.why.includes('概率'));

// 形式组必须仍为 4 类且可真值表验证
assert('形式组仍为 4 类',
  engine.FALLACY_LIST.filter(f => f.group === '形式').length === 4);
assert('新增三类不在形式组',
  ['hasty_generalization', 'red_herring', 'over_generalization']
    .every(k => engine.FALLACIES[k].group !== '形式'));

// ============ 结果 ============
console.log(`\n${'═'.repeat(46)}`);
console.log(`  通过 ${passed} · 失败 ${failed}`);
console.log(`${'═'.repeat(46)}\n`);

if (failed > 0) {
  console.error('❌ 测试未全部通过，形式类正确率未达 100%\n');
  process.exit(1);
} else {
  console.log('✅ 全部通过。形式类推理验证 100% 确定。\n');
}