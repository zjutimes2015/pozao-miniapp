/**
 * arg-framework.js — 论证质量三标准（ARG）
 *
 * 来源：加拿大哲学家 Trudy Govier 提出的 ARG 评价框架
 *  A — Acceptability 可接受性：理由本身可信吗
 *  R — Relevance 相关性：理由和结论有关系吗
 *  G — Good ground 充分性：理由够推出结论吗
 *
 * 定位：这是与 15 类谬误**正交**的第二个评分轴。
 *   15 类谬误回答「这是哪种错」→ 知识标签
 *   ARG 回答「这个论证哪一关没过」→ 质量评分
 *
 * 关键设计（v2.1 重要修正）：
 *   上一版 SPEC 断言「每题必须有唯一答案」，但研读实战题库后发现——
 *   6 道实战题里只有 1 道是唯一答案选择题，且涉及相关性/充分性的
 *   判断（类比、诉诸、因果）本质上无法判唯一。
 *
 *   因此修正认知：
 *     · 唯一答案是**形式逻辑**的底线，不是逻辑能力的底线
 *     · ARG 三维恰好把「不能判唯一」的部分结构化成**三个独立可判的子问题**
 *     · 每个子问题独立判定，不要求整段论证有唯一评价
 *
 * 课程原文把三类背景谬误映射到 ARG：
 *   「背景造假 → 可接受性」「滥用不相关背景 → 相关性」「把背景绝对化 → 充分性」
 */

// ============ ARG 三维定义 ============

const ARG_STANDARDS = {
  A: {
    key: 'A',
    name: '可接受性',
    en: 'Acceptability',
    question: '这个理由本身可信吗',
    // 课程第5课的四条快速判别贴士
    checks: [
      { id: 'A1', name: '词形信号', hint: '「大多数」「总是」「非常」「极个别」这类频率词与程度词，通常无法客观验证' },
      { id: 'A2', name: '价值判断', hint: '「好」「坏」「正义」「公平」—— 基于同样的事实，不同人的评价可以不同' },
      { id: 'A3', name: '因果解释', hint: '解释社会现象背后的原因，通常是观点而非事实' },
      { id: 'A4', name: '意见建议', hint: '「应该做 X」是建议，不是可验证的事实' },
    ],
    // 课程原文：「错误的事实陈述，也是事实陈述。关键看能不能客观验证」
    keyNote: '区分事实陈述与观点陈述：事实可用客观标准验证，有真伪；观点无所谓对错。但观点的论证质量有好坏之别。',
  },
  R: {
    key: 'R',
    name: '相关性',
    en: 'Relevance',
    question: '理由和结论有关系吗',
    checks: [
      { id: 'R1', name: '理由真的能撑起结论吗', hint: '前提存在，不代表结论随之成立' },
      { id: 'R2', name: '中间缺环吗', hint: '从理由到结论，通常需要若干隐含推论' },
      { id: 'R3', name: '有没有换议题', hint: '讨论的已经不是原来那个问题了' },
    ],
    // 课程第8课：滥用不相关背景的三种子类
    subTypes: [
      { key: 'reputation', name: '人品信誉滥用', hint: '因为一个人私德有问题，就否定他在公领域的专业判断' },
      { key: 'expertise', name: '专业跨域滥用', hint: 'A领域权威在B领域发言没分量。典型是「你行你上」' },
      { key: 'motive', name: '动机滥用', hint: '「都是为你好」—— 有好动机不等于建议就对' },
    ],
  },
  G: {
    key: 'G',
    name: '充分性',
    en: 'Good ground',
    question: '理由够推出结论吗',
    checks: [
      { id: 'G1', name: '有没有漏反例', hint: '只看了支持结论的证据，没看反对的' },
      { id: 'G2', name: '有没有夸大可能性', hint: '把「可能」当成了「一定」' },
      { id: 'G3', name: '能不能回应反驳', hint: '面对反对意见，是补充理由还是转移话题' },
    ],
    // 课程第2课的充分性操作定义
    checklist: [
      '做这件事有什么好处？好处有多重要？能不能通过其他方式得到？',
      '做这件事有什么坏处？坏处有多重要？能不能通过什么方式避免？',
    ],
  },
};

const ARG_LIST = [ARG_STANDARDS.A, ARG_STANDARDS.R, ARG_STANDARDS.G];

/**
 * 15 类谬误 → ARG 维度的归属
 *
 * 这是两个轴之间的桥：每种谬误本质上都是某一关没过。
 * 用途：
 *   1. 用户答错某类谬误时，能告诉他「你错过的是 ARG 的哪一关」
 *   2. 用户 ARG 某关失守时，能提示他留意哪几类谬误
 *   3. 指纹可按 ARG 维度聚合（训练层用）
 */
const ARG_MAPPING = {
  appeal_ignorance: 'A',
  appeal_popularity: 'R',
  appeal_authority: 'R',
  appeal_emotion: 'R',
  red_herring: 'R',
  affirming_consequent: 'G',
  denying_antecedent: 'G',
  hasty_generalization: 'G',
  false_cause: 'G',
  slippery_slope: 'G',
  over_generalization: 'G',
  equivocation: 'G',
  strawman: 'G',
  composition: 'G',
  reductio: 'G',
};

/**
 * 判定一段论证的 ARG 失守点
 *
 * 设计要点：这是**逐项独立判定**，不追求整段论证的「唯一总分」。
 * 每关独立给出 pass / fail，这样即使整体评价有争议，
 * 至少「理由是不是真的」这类问题仍可判定。
 *
 * @param {Object} input
 *   - facts:      事实类陈述数组
 *   - opinions:   观点类陈述数组
 *   - premiseCount: 理由条数
 *   - linksToConclusion: 理由与结论是否存在关联
 *   - hasCounterExample: 是否考虑过反例
 *   - usesProbabilityAsCertain: 是否把概率当必然
 *   - staysOnTopic: 是否始终围绕原议题
 * @returns {{A: {...}, R: {...}, G: {...}, weakest: string, summary: string}}
 */
function evaluateARG(input) {
  const d = Object.assign({
    facts: [],
    opinions: [],
    premiseCount: 0,
    linksToConclusion: true,
    hasCounterExample: false,
    usesProbabilityAsCertain: false,
    staysOnTopic: true,
    hiddenPremises: 0,
  }, input || {});

  const result = {};

  // ---- A 可接受性 ----
  const aChecks = [];
  // 观点混入理由，且未标注为观点 → 理由不可接受
  if (d.opinions.length > 0) {
    aChecks.push({
      id: 'A2',
      name: '价值判断混入理由',
      passed: false,
      hint: '理由里包含观点。观点无所谓真伪，但需要进一步证据支撑',
    });
  }
  if (d.facts.length > 0) {
    aChecks.push({ id: 'A1', name: '有可验证的事实支撑', passed: true });
  }
  if (aChecks.length === 0) {
    aChecks.push({
      id: 'A0',
      name: '缺少可判定的理由',
      passed: false,
      hint: '只有结论，没有理由。这不是论证',
    });
  }
  result.A = {
    key: 'A',
    passed: aChecks.every(c => c.passed),
    checks: aChecks,
  };

  // ---- R 相关性 ----
  const rChecks = [];
  rChecks.push({
    id: 'R1',
    name: '理由与结论的关联',
    passed: d.linksToConclusion,
    hint: d.linksToConclusion ? '' : '理由和结论之间缺少有效支撑',
  });
  rChecks.push({
    id: 'R3',
    name: '是否始终围绕议题',
    passed: d.staysOnTopic,
    hint: d.staysOnTopic ? '' : '讨论已经挪到了别的问题上',
  });
  if (d.hiddenPremises > 0) {
    rChecks.push({
      id: 'R2',
      name: '隐含前提',
      passed: true,
      detail: `${d.hiddenPremises} 处`,
      hint: '存在没说出来的理由，需要补全后才能判断关联',
    });
  }
  result.R = {
    key: 'R',
    passed: rChecks.every(c => c.passed),
    checks: rChecks,
  };

  // ---- G 充分性 ----
  const gChecks = [];
  gChecks.push({
    id: 'G1',
    name: '是否考虑过反例',
    passed: d.hasCounterExample,
    hint: d.hasCounterExample ? '' : '只看了支持结论的证据',
  });
  gChecks.push({
    id: 'G2',
    name: '是否把概率当成必然',
    passed: !d.usesProbabilityAsCertain,
    hint: d.usesProbabilityAsCertain
      ? '信誉、专业、立场都只是概率，不能绝对化'
      : '',
  });
  if (d.premiseCount > 0 && d.premiseCount < 2) {
    gChecks.push({
      id: 'G3',
      name: '理由条数',
      passed: false,
      detail: `${d.premiseCount} 条`,
      hint: '单一理由难以构成充分论证',
    });
  }
  result.G = {
    key: 'G',
    passed: gChecks.every(c => c.passed),
    checks: gChecks,
  };

  // ---- 汇总 ----
  const fails = ARG_LIST.filter(s => !result[s.key].passed).map(s => s.key);
  const weakest = fails.length > 0 ? fails[0] : null;

  let summary;
  if (fails.length === 0) {
    summary = '三关都过了。这是一个论证质量较高的推理。';
  } else if (fails.length === 3) {
    summary = '三关都没过。先别急着改结论，回去检查理由本身站不站得住。';
  } else {
    const names = fails.map(k => ARG_STANDARDS[k].name).join('、');
    summary = `失守在${names}。${weakestHint(weakest)}`;
  }

  return {
    A: result.A, R: result.R, G: result.G,
    weakest,
    failedStandards: fails,
    summary,
    /** 完整度：通过的关卡数 / 3 */
    completeness: 3 - fails.length,
  };
}

function weakestHint(key) {
  if (key === 'A') return '理由本身不可信，先确认它是不是事实——观点需要证据才能用。';
  if (key === 'R') return '理由可能是真的，但和这个结论没有关系。';
  if (key === 'G') return '理由和结论有关，但不足以推出它——可能漏了反例，或者把「大概率」说成了「一定」。';
  return '';
}

/**
 * 训练层用的 ARG 训练反馈
 * 依据 Deci et al. (1999)：只使用正面言语反馈（d=+0.33，唯一正向外在刺激）
 * 禁止使用「答对即得 N 积分」式确定性物质奖励（d=−0.40）
 */
function buildARGTrainingFeedback(evaluation) {
  const { weakest, failedStandards } = evaluation;

  if (!weakest) {
    return {
      tone: 'praise',
      text: '三关都过了。你的理由本身站得住，也确实撑起了这个结论。',
      focus: null,
    };
  }

  const std = ARG_STANDARDS[weakest];
  const relatedFallacies = Object.keys(ARG_MAPPING)
    .filter(k => ARG_MAPPING[k] === weakest);

  const opening = failedStandards.length === 1
    ? `这一关没过：${std.name}。`
    : `你同时漏了 ${failedStandards.map(k => ARG_STANDARDS[k].name).join('、')}，先看最前面的${std.name}。`;

  return {
    tone: 'redirect',
    text: opening + weakestHint(weakest),
    focus: weakest,
    focusName: std.name,
    checks: std.checks,
    relatedFallacies,
    /** 提示相关谬误的中文名，便于跳转训练 */
    hint: relatedFallacies.length > 0
      ? `这类问题对应的常见谬误有 ${relatedFallacies.length} 种，训练层里可以针对性练。`
      : '',
  };
}

/**
 * 首测与训练层的边界控制
 *
 * 决策（v2.1）：ARG 只在训练层与月测出现，首测仍用 15 维单选。
 * 理由：
 *   1. 首测目标是「让用户发现自己不知道」，不是「教会框架」
 *   2. ARG 引入后会同时增加维度与认知负担，3 分钟首测会超载
 *   3. 首测保持单选，维持「零门槛」体验
 *
 * 这个函数是这条边界的强制点，防止后续迭代误把 ARG 塞回首测。
 */
const ARG_MODES = {
  SOLO: 'solo',        // 首测：禁用 ARG
  VERSUS: 'versus',    // 对攻：禁用 ARG（保持轻量）
  TRAIN: 'train',      // 训练层：启用 ARG
  MONTHLY: 'monthly',  // 月测：启用 ARG
};

function argEnabledFor(mode) {
  return mode === ARG_MODES.TRAIN || mode === ARG_MODES.MONTHLY;
}

module.exports = {
  ARG_STANDARDS,
  ARG_LIST,
  ARG_MAPPING,
  ARG_MODES,
  argEnabledFor,
  evaluateARG,
  buildARGTrainingFeedback,
  weakestHint,
};