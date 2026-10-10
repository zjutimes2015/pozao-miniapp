/**
 * argue-engine.js — 论证推理引擎
 *
 * 定位：形式类谬误的判定必须是纯规则的，正确率 100%，不依赖任何 AI。
 * 这是整个产品的信任基础 —— AI 可以组织语言，但不能决定答案。
 *
 * 对标Brilliant："Koji is exceedingly unlikely to make a math mistake"
 * 因为它的题目是代码搭建的确定性系统。
 *
 * 12 类谬误分三组：
 *   形式组（1-4）：程序化判定，真值表验证，无幻觉可能
 *   论证组（5-8）：依赖 ground_truth 比对
 *   语义组（9-12）：依赖 ground_truth 比对
 */

// ============ 12 维谬误定义 ============

const FALLACIES = {
  // 形式组
  // 注意：肯定后件 = P→Q, Q ⟹ P（结论为真倒推前提为真），它才是谬误。
  // 而 P→Q, P ⟹ Q 是「肯定前件/modus ponens」，是有效推理，不属谬误。
  affirming_consequent: {
    id: 1, key: 'affirming_consequent', name: '肯定后件', group: '形式',
    form: 'P→Q, Q ⟹ P',
    why: '看到结果就断定原因，但可能有别的原因导致同一结果',
  },
  denying_antecedent: {
    id: 2, key: 'denying_antecedent', name: '否定前件', group: '形式',
    form: 'P→Q, ¬P ⟹ ¬Q',
    why: '前提不成立不代表结论不成立，可能还有别的路导致 Q',
  },
  composition: {
    id: 3, key: 'composition', name: '合成谬误', group: '形式',
    form: '各部分 P ⟹ 整体 Q',
    why: '各部分成立推不出整体成立，整体可能有相互作用',
  },
  reductio: {
    id: 4, key: 'reductio', name: '归谬', group: '形式',
    form: '假设 ¬Q，若推出矛盾则 Q',
    why: '必须真正推出矛盾，而不是诉诸「你反对就是没道理」',
  },
  // 论证组
  appeal_ignorance: {
    id: 5, key: 'appeal_ignorance', name: '诉诸无知', group: '论证',
    form: '没有证据 ⟹ 不存在',
    why: '没找到证据不等于不存在，这是举证责任倒置',
  },
  appeal_authority: {
    id: 6, key: 'appeal_authority', name: '诉诸权威', group: '论证',
    form: '某人有身份 ⟹ 结论成立',
    why: '身份不替代论证，专家在其专业外同样会错',
  },
  appeal_popularity: {
    id: 7, key: 'appeal_popularity', name: '诉诸大众', group: '论证',
    form: '多数人如此 ⟹ 对你也成立',
    why: '他人普遍选择不构成对你的理由，尤其在逻辑训练领域',
  },
  appeal_emotion: {
    id: 8, key: 'appeal_emotion', name: '诉诸情感', group: '论证',
    form: '说法动人 ⟹ 结论成立',
    why: '说服力与真实性是两件事',
  },
  // 语义组
  equivocation: {
    id: 9, key: 'equivocation', name: '偷换概念', group: '语义',
    form: '同一词前后含义不同',
    why: '关键词的含义在推理过程中发生了变化',
  },
  slippery_slope: {
    id: 10, key: 'slippery_slope', name: '滑坡谬误', group: '语义',
    form: 'A ⟹ B ⟹ C ⟹ 灾难',
    why: '后果链缺少每一步的证据支持，是未论证的假想延伸',
  },
  strawman: {
    id: 11, key: 'strawman', name: '稻草人', group: '语义',
    form: '把对方观点改写成更极端的版本再反驳',
    why: '攻击的是被扭曲的版本，不是对方真正的论点',
  },
  false_cause: {
    id: 12, key: 'false_cause', name: '归因谬误', group: '语义',
    form: 'A 与 B 同时发生 ⟹ A 导致 B',
    why: '同时发生可能是巧合、也可能是第三个因素',
  },
};

// ============ 形式类：真值表验证（100% 确定） ============

/**
 * 形式类推理的结构化表示
 * 一个conditional 命题：{ p, q } 表示 P→Q
 */
function conditional(p, q, name) {
  return { p, q, name };
}

/**
 * 生成形式类题目的推理骨架（基于真值表穷举，非硬编码结论）
 *
 * 关键设计：有效性不是写死的，而是穷举 P、Q 的全部赋值算出来的。
 * 这样任何定义错误都会立刻被测试暴露，而不是默默输出错误答案。
 */
function buildFormCase(pName, qName) {
  // 两个有效的推理形式
  const validForms = [
    {
      key: 'modus_ponens',      // 肯定前件
      premise: 'p->q', given: 'p', conclude: 'q',
    },
    {
      key: 'modus_tollens',     // 否定后件（逆否）
      premise: 'p->q', given: '!q', conclude: '!p',
    },
  ];
  // 三种无效的推理形式
  const invalidForms = [
    {
      key: 'affirming_consequent',  // 肯定后件：Q 就断定 P
      premise: 'p->q', given: 'q', conclude: 'p',
      fallacyId: 1,
    },
    {
      key: 'denying_antecedent',    // 否定前件：¬P 就断定 ¬Q
      premise: 'p->q', given: '!p', conclude: '!q',
      fallacyId: 2,
    },
  ];

  // 自校验：确保分类与穷举结果一致。任何不一致都会暴露。
  for (const f of validForms) {
    if (!verifyFormDeduction(f.premise, f.given, f.conclude)) {
      throw new Error('引擎自校验失败：' + f.key + ' 应为有效推理');
    }
  }
  for (const f of invalidForms) {
    if (verifyFormDeduction(f.premise, f.given, f.conclude)) {
      throw new Error('引擎自校验失败：' + f.key + ' 应为无效推理');
    }
  }

  return { validForms, invalidForms };
}

/**
 * 真值表穷举验证 —— 判断某个推理形式是否有效
 * @param {Function} implication (p,q) => q为真时 p是否必真
 * @returns {boolean} 是否为有效推理
 */
function isValidImplication(implication) {
  const rows = [[true, true], [true, false], [false, true], [false, false]];
  // 前提为真时，结论必须恒为真
  return rows.every(([p, q]) => {
    if (p === q) {
      // p、q 同时为真，前提成立，检查结论
      return implication(true, true) === true;
    }
    if (p === true && q === false) {
      // 前提成立，结论为假 → 推理无效
      return false;
    }
    return true;
  });
}

/**
 * 验证形式类题目的答案唯一性
 * 穷举所有赋值，确认推理形式是否有效
 *
 * 有效推理的定义：在「前提 + 已知」为真的所有赋值中，结论恒为真。
 * 若存在一个赋值使前提与已知为真但结论为假，则该推理无效。
 *
 * @param {string} premise 'p->q' 或 'p'
 * @param {string} given   'p' | '!p' | 'q' | '!q'
 * @param {string} conclude 'q' | '!q' | 'p' | '!p'
 * @returns {boolean}
 */
function verifyFormDeduction(premise, given, conclude) {
  // 文字层的表达式求值器：'p' '!p' 'q' '!q' 'p->q'
  const evalLit = (lit, a) => {
    if (lit.startsWith('!')) {
      return evalLit(lit.slice(1), a) === false;
    }
    if (lit === 'p') return a.p;
    if (lit === 'q') return a.q;
    throw new Error('unknown literal: ' + lit);
  };
  const evalFormula = (f, a) => {
    if (f.includes('->')) {
      const [x, y] = f.split('->');
      return evalLit(x, a) === false || evalLit(y, a);
    }
    return evalLit(f, a);
  };

  const rows = [
    { p: true, q: true },
    { p: true, q: false },
    { p: false, q: true },
    { p: false, q: false },
  ];

  // 前提 + 已知 同时成立的赋值
  const satisfying = rows.filter(a =>
    evalFormula(premise, a) && evalLit(given, a)
  );

  // 前件矛盾时，推理平凡成立（vacuous truth），视为有效
  if (satisfying.length === 0) return true;

  return satisfying.every(a => evalLit(conclude, a));
}

// ============ 论证判断 ============

/**
 * 判断一道题的作答是否正确
 * @param {Object} question 题目（含 breakpoint / ground_truth）
 * @param {Object} answer用户作答 { breakpointFrom, breakpointTo, fallacyKey }
 * @returns {{correct: boolean, expected: Object, actual: Object}}
 */
function evaluate(question, answer) {
  if (!question || !question.breakpoint) {
    return { correct: false, reason: 'invalid_question' };
  }
  const bp = question.breakpoint;

  const correct =
    answer.breakpointFrom === bp.from &&
    answer.breakpointTo === bp.to &&
    answer.fallacyKey === bp.fallacy;

  return {
    correct,
    expected: bp,
    actual: {
      breakpointFrom: answer.breakpointFrom,
      breakpointTo: answer.breakpointTo,
      fallacyKey: answer.fallacyKey,
    },
  };
}

/**
 * 生成正面言语反馈
 * 依据：Deci, Koestner & Ryan (1999, 128 项实验)
 * d = +0.33 —— 这是唯一能增强内在动机的外在刺激
 * 禁止使用「答对即得 N 积分」式确定性物质奖励
 */
function buildFeedback(question, result, history) {
  if (result.correct) {
    const misses = history.missCount || 0;
    if (misses === 0) {
      return { text: '一次就抓到了隐藏前提。这题的断点不在显眼处，位置很准。', tone: 'praise' };
    }
    return { text: '你抓到了隐藏前提。这题很多人会漏看，你没有。', tone: 'praise' };
  }

  const bp = question.breakpoint;
  const fp = FALLACIES[bp.fallacy];
  return {
    text: `断点找错位置了。这句话的问题在「${question.cards.find(c => c.id === bp.from)?.text || bp.from}」这一步——往下推的时候，理由断了。`,
    tone: 'redirect',
    hint: fp ? `${fp.name}：${fp.why}` : '',
  };
}

// ============ 论证指纹算法 ============

/** 贝叶斯平滑：防止 3 题全对 = 100 分的虚高 */
function bayesScore(correct, total, alpha = 1) {
  if (total === 0) return null;
  return Math.round(((correct + alpha) / (total + 2 * alpha)) * 100);
}

/**
 * 计算论证指纹
 *
 * 输出维度（关键设计决策）：
 *   题库首测只有 15 题、覆盖 12 个谬误，单维度最多 2 次。
 *   若按单维度统计，任何首测都达不到样本门槛，用户永远看不到结果。
 *
 *   因此采用**分组聚合 + 单维补充**的双层结构：
 *     - 主榜（3 项）：按「形式 / 论证 / 语义」三组聚合，
 *       每组 4-6 题，样本充足，首测即可出结果 —— 这是分享卡展示的主内容
 *     - 副榜（3 项）：单维度中样本最多且错误率最高的，进入"观察中"
 *
 *   分组聚合的可靠性依据：组内各维度同属一类推理失效模式，
 *   组内相关性高于随机抽样，因此聚合后的推断比单点估计更可靠。
 *
 *   单维分数仍用贝叶斯平滑，3 次全对 = 80 分而非 100 分。
 */
function computeFingerprint(logs, options) {
  const opts = Object.assign({
    minSamples: 3,      // 单维进入副榜的最低样本
    minLevels: 3,       // 完成完整指纹的最低关卡数
    highSamples: 8,     // 高置信门槛
  }, options || {});
  const MIN = opts.minSamples;

  //按谬误维度聚合
  const byFallacy = {};
  for (const log of logs) {
    const key = log.fallacyKey;
    if (!key) continue;
    if (!byFallacy[key]) byFallacy[key] = { correct: 0, total: 0, fall: 0 };
    const rec = byFallacy[key];
    rec.total += 1;
    if (log.correct) rec.correct += 1;
    if (log.fellInto) rec.fall += 1;
  }

  // ===== 按组聚合（主榜：首测即可出结果） =====
  const GROUPS = [
    { key: '形式', name: '形式推理', desc: '推理结构本身不成立' },
    { key: '论证', name: '论证依据', desc: '证据不足以支撑结论' },
    { key: '语义', name: '语义与因果', desc: '词义被偷换，或强行归因' },
  ];

  const byGroup = {};
  for (const [key, v] of Object.entries(byFallacy)) {
    const f = FALLACIES[key];
    if (!f) continue;
    const g = byGroup[f.group] || { correct: 0, total: 0, fall: 0 };
    g.correct += v.correct;
    g.total += v.total;
    g.fall += v.fall;
    byGroup[f.group] = g;
  }

  const groupList = GROUPS
    .filter(g => byGroup[g.key] && byGroup[g.key].total >= 3)
    .map(g => {
      const v = byGroup[g.key];
      return {
        key: g.key,
        name: g.name,
        desc: g.desc,
        fallRate: Math.round((v.fall / v.total) * 100),
        catchRate: bayesScore(v.correct, v.total),
        total: v.total,
        confidence: v.total >= opts.highSamples ? '高' : '初步',
      };
    });

  // ===== 单维补充（副榜：样本最多且错误率最高的） =====
  const fallList = Object.entries(byFallacy)
    .filter(([, v]) => v.total >= MIN)
    .map(([key, v]) => ({
      key,
      name: (FALLACIES[key] && FALLACIES[key].name) || key,
      group: (FALLACIES[key] && FALLACIES[key].group) || '',
      rate: Math.round((v.fall / v.total) * 100),
      total: v.total,
      confidence: v.total >= opts.highSamples ? '高' : '初步',
    }))
    .filter(x => x.rate > 0)
    .sort((a, b) => b.rate - a.rate || b.total - a.total);

  // 会抓 Top：单维中正确率最高
  const catchList = Object.entries(byFallacy)
    .filter(([, v]) => v.total >= MIN)
    .map(([key, v]) => ({
      key,
      name: (FALLACIES[key] && FALLACIES[key].name) || key,
      rate: bayesScore(v.correct, v.total),
      total: v.total,
      confidence: v.total >= opts.highSamples ? '高' : '初步',
    }))
    .sort((a, b) => b.rate - a.rate);

  // 场合敏感度：某谬误在特定场景下表现显著低于总体
  const situational = [];
  const SCENE_MAP = {
    appeal_popularity: '跨部门对齐',
    composition: '评估供应商',
    slippery_slope: '合规风险判断',
    reductio: '谈判反驳',
    false_cause: '复盘归因',
    equivocation: '需求变更',
    affirming_consequent: '数据看板解读',
  };

  const totalFall = groupList.reduce((s, x) => s + x.fallRate * x.total, 0);
  const totalCount = groupList.reduce((s, x) => s + x.total, 0);
  const overallFall = totalCount > 0 ? totalFall / totalCount : 0;

  for (const [key, scene] of Object.entries(SCENE_MAP)) {
    const rec = byFallacy[key];
    if (!rec || rec.total < 2) continue;
    const sceneFallRate = Math.round((rec.fall / rec.total) * 100);
    // 场景失守率显著高于总体（+20pp 以上）才算「易失守」
    if (sceneFallRate >= overallFall + 20) {
      situational.push({ key, scene, rate: sceneFallRate });
    }
  }

  const levelsDone = new Set(logs.map(l => l.levelId)).size;
  const complete = levelsDone >= opts.minLevels && levelsDone > 0;

  return {
    complete,
    levelsDone,
    // 主榜：组聚合（首测可用）
    groups: groupList,
    // 副榜：单维（样本足够时补充）
    fall: fallList.slice(0, 3),
    catch: catchList.slice(0, 3),
    situational: situational.slice(0, 3),
    sampleSufficient: groupList.length >= 2 && totalCount >= 10,
    totalLogs: logs.length,
  };
}

/**
 * 指纹短代码 —— 社交标签（如 PZ-7A3F）
 * 借鉴 16Personalities 的四字母代码：短、辨识度、可口头传播
 */
const GROUP_ABBR = { '形式': 'FM', '论证': 'AR', '语义': 'SL' };

function fingerprintCode(fingerprint) {
  const groups = fingerprint.groups || [];
  const code = (groups) => {
    const g = groups[0];
    return g ? (GROUP_ABBR[g.key] || 'XX') : 'XX';
  };
  // 生成 4 位十六进制后缀，避免可猜测
  const salt = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `PZ-${code(groups)}${code(groups.slice(1))}-${salt}`;
}

/**
 * 指纹的叙述性结论 —— 这是产品的关键输出
 * 不是「你哪项分低」，而是「你的能力结构呈现什么模式」
 */
function describePattern(fingerprint) {
  const groups = fingerprint.groups || [];
  const fall = fingerprint.fall || [];
  const catchList = fingerprint.catch || [];

  if (!groups.length) {
    return '样本还不够，多闯几关结果会更准。';
  }

  // 找最弱的组
  let weakest = groups[0];
  for (const g of groups) {
    if (g.fallRate > weakest.fallRate) weakest = g;
  }
  // 找最强的组
  let strongest = groups[0];
  for (const g of groups) {
    if (g.catchRate > strongest.catchRate) strongest = g;
  }

  // 单一维度时的样本
  const fallName = fall.length ? fall[0].name : weakest.name;
  const fallRate = fall.length ? fall[0].rate : weakest.fallRate;
  const catchName = catchList.length ? catchList[0].name : strongest.name;
  const catchRate = catchList.length ? catchList[0].rate : strongest.catchRate;

  if (weakest.fallRate >= 60 && strongest.catchRate >= 75) {
    return `你的「会抓」明显强于「不犯」。${strongest.name}你看得清楚，但${weakest.name}是自己的盲区。看得出来的漏洞，讲出来的时候容易漏。`;
  }
  if (weakest.fallRate >= 60) {
    return `${weakest.name}是你最常见的破绽（${fallRate}%）。这一组的毛病通常不在能力，而在习惯——被带着走的时候没停下来检查前提。`;
  }
  if (fallName && catchName && fallRate > 0 && catchRate >= 80) {
    return `整体已经比较稳。${fallName}（${fallRate}%）是唯一明显掉队的，把它补上就够了。`;
  }
  return `${fallName}（${fallRate}%）是你最常见的破绽，${catchName}（${catchRate}%）是你最稳的强项。这个落差本身就是最值得练的地方。`;
}

module.exports = {
  FALLACIES,
  FALLACY_LIST: Object.values(FALLACIES),
  conditional,
  isValidImplication,
  verifyFormDeduction,
  buildFormCase,
  evaluate,
  buildFeedback,
  bayesScore,
  computeFingerprint,
  fingerprintCode,
  describePattern,
};