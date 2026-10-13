/**
 * troll-screen.js — 杠精筛查四关 + 应对话术
 *
 * 来源：《实用逻辑训练营》第 7 课「周末实战：化解杠精套路，掌控对话」
 *
 * 为什么这个结构值得单独做成模块：
 *
 *   识别型（15 类谬误）      vs    应对型（本模块）
 *   判定结果：多标签，常同时命中多个      单标签、线性，天然单选
 *   干扰项设计：难，易多解              易，四选一
 *   教学价值：知识                      知识 + 行动
 *
 * 四关是**通过/不通过**关系，不是并列关系：
 *   一段对话只需要在第一个未通过的关卡停下 —— 这天然就是单选题的骨架。
 *
 * 课程原文：
 *   「我把这四句话称作【杠精筛查法】」
 *   「我们不仅可以用这四个问题去检查杠精所言是否有道理，
 *     更重要的是要用来进行言论自检，看看自己的立论是否能够在逻辑自洽。」
 *
 * 注意：课程自己也强调这四问用于**自检**，不只是评判他人。
 */

// ============ 四关定义 ============

const CHECKS = [
  {
    key: 1,
    name: '有没有给理由',
    short: '讲不讲理',
    question: '对方有没有为自己的否定意见给出理由？',
    // 未给理由的三种形态
    patterns: [
      { key: 'direct_deny', name: '直接否定', desc: '只有结论，没有理由' },
      { key: 'derail', name: '转移话题', desc: '答非所问，把讨论挪走' },
      { key: 'attack', name: '人身攻击', desc: '用动机推断代替论证' },
    ],
    strategies: [
      {
        key: 'ignore',
        name: '不加理睬',
        desc: '不浪费时间，忽略对方',
      },
      {
        key: 'demand',
        name: '索要理由',
        desc: '他不讲理，就向他要理由',
        template: '你说这件事不好，你为什么这么说呢？',
        // 课程强调这个动作的副作用
        note: '很多时候，当你用这种愿意倾听、愿意沟通的姿态提问，对方会突然意识到自己是在和一个真实的人对话。',
      },
    ],
  },
  {
    key: 2,
    name: '理由是真的吗',
    short: '真不真',
    question: '对方提供的理由是不是真实？',
    patterns: [
      { key: 'hearsay', name: '道听途说', desc: '来源不明，无法核实' },
    ],
    strategies: [
      {
        key: 'ask_source',
        name: '问信息来源',
        desc: '向对方索要信息源和证据',
        template: '你是怎么知道的？你有证据吗？',
        note: '一条信息如果是假消息，往往无法找到靠谱的信息源。这个问题往往可以将道听途说的杠精锁死。',
      },
      {
        key: 'debunk',
        name: '主动辟谣',
        desc: '主动检索更多证据来证实或证伪',
        note: '这种方式更适合网上有时间差的论战',
      },
    ],
  },
  {
    key: 3,
    name: '理由和结论相关吗',
    short: '相不相关',
    question: '对方的理由和他的结论是否相关？',
    // 这一关分两种情形，处置方式完全不同 —— 这是最精细的设计
    branches: [
      {
        key: 'strawman',
        name: '稻草人',
        desc: '他反驳的并不是你提出的观点',
        detect: '把对方的观点忽略、曲解或扭曲，再套进自己的逻辑',
        // 强硬路线
        strategies: [
          {
            key: 'mock',
            name: '冷嘲热讽',
            desc: '提醒对方加强阅读理解训练',
          },
          {
            key: 'clarify',
            name: '澄清定义',
            desc: '指出对方偷换的概念，用更通俗的方式重申自己的观点及论证',
            template: '我反对性骚扰，不等于打倒男人。我从来没有说过反对性骚扰就是要让女性统治世界。性骚扰是指不受欢迎的言语或身体碰触，反对这些行为，是为了尊重每个人被尊重的权利。',
          },
        ],
      },
      {
        key: 'irrelevant',
        name: '错误诉诸',
        desc: '用不相干的背景来否定对方',
        detect: '攻击对方的人品、私生活、身份，而不是他的观点',
        strategies: [
          {
            key: 'concede_split',
            name: '承认再切割',
            desc: '三步式：承认理由成立 → 指出与议题无关 → 引导回相关因素',
            // 课程用图示给出的三步结构
            steps: [
              { step: 1, text: '无妨承认他提出的理由是成立的', example: '老薛在某些方面是挺渣的，' },
              { step: 2, text: '指出这个理由和正在讨论的事情无关', example: '但是，他的歌写的好不好听，跟他这个人渣不渣没关系，' },
              { step: 3, text: '指出哪些因素才是相关的，友好询问对方在相关因素上是否有不同意见', example: '我们可以好好讨论下他的这首歌，你到底哪儿不喜欢？' },
            ],
            template: '歌手的歌好不好听，跟这个人渣不渣有关系吗？',
          },
        ],
      },
    ],
  },
  {
    key: 4,
    name: '推理片面吗',
    short: '片不片面',
    question: '对方的推理是否片面？',
    definition: '在推理的过程中，没有充分考虑到各种情况，遗漏了其他的可能性、遗漏反例。',
    // 课程点名三种
    patterns: [
      { key: 'false_analogy', name: '错误类比', desc: '类比对象的关键差异被忽略' },
      { key: 'hasty', name: '以偏概全', desc: '用一个个例去反驳某种普遍现象' },
      { key: 'simple_cause', name: '简单归因', desc: '把复杂原因归结为单一因素' },
    ],
    strategies: [
      {
        key: 'counter',
        name: '指出盲区',
        desc: '指出被他们忽略的其他情况、没想到的反例',
      },
      {
        key: 'gather',
        name: '搜集数据',
        desc: '要求更高：不仅要指出盲区，还要搜集更多数据证明他们提出的情况不成立',
        note: '例如在北京拥堵的案例上，可以对比北京和东京核心城区的人口密度——可能比人数更相关的因素是一个城市的交通供应、管理能力。',
      },
    ],
  },
];

const CHECK_LIST = CHECKS;

/**
 * 筛查一段对话在第几关失守
 *
 * 关键：四关是线性通过制，**在第一个未通过的关卡停下**。
 * 这让判定天然是单选 —— 不需要用户同时判断四个维度。
 *
 * @param {Object} dialog
 *   - hasReason:       是否给出了理由
 *   - reasonVerifiable:理由是否可核实
 *   - reasonRelevant:  理由与结论是否相关
 *   - branch3:         第3关情形（仅当 relevant=false 时需要）
 *   - reasoningOneSided: 推理是否片面
 * @returns {{passed: number, failedAt: number|null, checks: Array, ...}}
 */
function screen(dialog) {
  const d = Object.assign({
    hasReason: true,
    reasonVerifiable: true,
    reasonRelevant: true,
    branch3: null,
    reasoningOneSided: false,
  }, dialog || {});

  const results = [];

  // 第1关
  results.push({
    key: 1,
    passed: d.hasReason,
    detail: d.hasReason ? '' : '对方没有给理由',
  });

  // 线性短路：第1关没过就不用看后面
  if (!d.hasReason) {
    return finalize(1, results, d);
  }

  // 第2关
  results.push({
    key: 2,
    passed: d.reasonVerifiable,
    detail: d.reasonVerifiable ? '' : '理由来源不明，无法核实',
  });
  if (!d.reasonVerifiable) {
    return finalize(2, results, d);
  }

  // 第3关
  results.push({
    key: 3,
    passed: d.reasonRelevant,
    detail: d.reasonRelevant ? '' : '理由与结论无关',
    branch: d.reasonRelevant ? null : d.branch3,
  });
  if (!d.reasonRelevant) {
    return finalize(3, results, d);
  }

  // 第4关
  results.push({
    key: 4,
    passed: !d.reasoningOneSided,
    detail: d.reasoningOneSided ? '推理不全面' : '',
  });

  return finalize(d.reasoningOneSided ? 4 : null, results, d);
}

function finalize(failedAt, results, dialog) {
  const check = failedAt ? CHECKS.find(c => c.key === failedAt) : null;
  const passedCount = results.filter(r => r.passed).length;

  return {
    failedAt,
    passedCount,
    totalChecks: CHECKS.length,
    results,
    // 停在第几关，以及这一关该怎么说
    stopAt: failedAt,
    stopName: check ? check.name : null,
    stopQuestion: check ? check.question : null,
    branch3: failedAt === 3 ? dialog.branch3 : null,
    // 四关都过 —— 说明不是抬杠，而是真的在讨论
    allPassed: failedAt === null,
    summary: buildSummary(failedAt, passedCount, dialog),
  };
}

function buildSummary(failedAt, passedCount, dialog) {
  if (failedAt === null) {
    return '四关都过了。这不是抬杠，是真的在讲理 —— 但也可能是对方论证本身有问题，只是碰巧每关都答上了。';
  }
  const check = CHECKS.find(c => c.key === failedAt);
  if (failedAt === 1) {
    return '第一关就没过：对方没给理由。这时候争论内容没有意义，先把理由问出来。';
  }
  if (failedAt === 2) {
    return `理由${passedCount === 1 ? '有，' : ''}但来源不明。真假没确认之前，后面的讨论都建在流沙上。`;
  }
  if (failedAt === 3) {
    if (dialog.branch3 === 'strawman') {
      return '第三关失守，但对方攻击的不是你的观点，是他自己想象的版本。做法是澄清定义，把概念摆回原位。';
    }
    return '第三关失守：理由可能是真的，但和这个议题无关。做法是先承认，再切割，最后引导回相关因素。';
  }
  return '第四关失守：理由和结论都有关联，但推理不全面，遗漏了其他可能性。做法是指出盲区，或者搜集数据补上。';
}

/**
 * 生成应对建议（含话术模板）
 *
 * @param {Object} screenResult screen() 的返回值
 * @param {string} [branchOverride] 手动指定分支（用于教学演示）
 */
function buildResponse(screenResult, branchOverride) {
  const { failedAt, branch3: resultBranch } = screenResult;
  if (!failedAt) {
    return {
      tone: 'praise',
      text: '四关都过了。这时候该做的是认真回应内容，而不是纠正对方——他确实在讲理。',
      strategies: [],
      template: null,
    };
  }

  const check = CHECKS.find(c => c.key === failedAt);
  const branch = branchOverride || resultBranch;

  // 第3关有双分支，策略集不同
  if (check.branches) {
    const b = check.branches.find(x => x.key === branch) || check.branches[0];
    const strategies = b.strategies.map(s => ({
      key: s.key,
      name: s.name,
      desc: s.desc,
      template: s.template || null,
      steps: s.steps || null,
    }));
    return {
      tone: 'redirect',
      text: `第三关失守（${b.name}）。${b.desc}`,
      branch: b.key,
      branchName: b.name,
      detectHint: b.detect,
      strategies,
      template: strategies.find(s => s.template) ?
        strategies.find(s => s.template).template : null,
    };
  }

  const strategies = (check.strategies || []).map(s => ({
    key: s.key,
    name: s.name,
    desc: s.desc,
    template: s.template || null,
    note: s.note || null,
  }));

  return {
    tone: 'redirect',
    text: `停在第${failedAt}关：${check.name}。${check.question}`,
    strategies,
    template: strategies.find(s => s.template) ?
      strategies.find(s => s.template).template : null,
  };
}

/**
 * 自检模式 —— 课程明确说这套四问也可以检查自己
 * 「更重要的是要用来进行言论自检，看看自己的立论是否能够在逻辑自洽。」
 *
 * 注意默认值与 screen() 相反：
 *   screen() 判断他人，默认全部通过（不主动指控）
 *   selfCheck() 判断自己，必须显式声明每项，否则就是「没做」
 *   课程原文「看看自己的立论是否能够在逻辑自洽」——
 *   自检的默认应是「尚未确认」，而不是「默认没问题」。
 */
function selfCheck(myArgument) {
  const d = myArgument || {};

  // 缺参数视为 null = 未声明 = 不通过
  const hasReason = d.hasReason === true;
  const reasonVerifiable = d.reasonVerifiable === true;
  const reasonRelevant = d.reasonRelevant === true;
  const notOneSided = d.reasoningOneSided === false;

  const gaps = [];
  const passed = [];

  if (hasReason) {
    passed.push('你给出了理由');
  } else {
    gaps.push('你只给了结论，没有给理由');
  }

  if (hasReason) {
    if (reasonVerifiable) passed.push('理由来源你验证过');
    else gaps.push('你的理由来源不明，自己也没验证过');
  }

  if (hasReason && reasonVerifiable) {
    if (reasonRelevant) passed.push('理由和结论之间没有缺环');
    else gaps.push('你的理由和你的结论之间，缺环');
  }

  if (notOneSided) passed.push('你考虑了其他可能性');
  else gaps.push('你的推理只覆盖了一面，漏了其他可能性');

  const allPassed = gaps.length === 0;

  return {
    passed: allPassed,
    passedChecks: passed,
    gaps,
    text: allPassed
      ? '你的四关都过了。这段话在逻辑上是自洽的。'
      : '先修这一处：' + gaps[0],
  };
}

/**
 * 把杠精失守点映射到 ARG 维度 —— 与 15 维模型打通
 */
const CHECK_TO_ARG = {
  1: 'A',  // 没给理由 → 理由本身不存在
  2: 'A',  // 理由不真 → 可接受性
  3: 'R',  // 理由不相关 → 相关性
  4: 'G',  // 推理片面 → 充分性
};

module.exports = {
  CHECKS,
  CHECK_LIST,
  CHECK_TO_ARG,
  screen,
  buildResponse,
  buildSummary,
  selfCheck,
};