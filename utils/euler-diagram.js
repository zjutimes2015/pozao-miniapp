/**
 * euler-diagram.js — 欧拉图：形式组的可视化推理工具
 *
 * 来源：《实用逻辑训练营》第 4 课「核心方法三：欧拉图法」
 *
 * 为什么把它做成形式组的呈现方式：
 *
 *   12/15 维里，只有形式组能画成同心圆并得到唯一判定。
 *   课程第 4 课的三类典型错误，与我们的形式组完全同构：
 *
 *     看到 a 是 b，就认为 非a 是 非b   → 否定前件
 *     看到 a 是 b，就认为 b 是 a       → 肯定后件
 *     看到「有的a是b」，就认为「a都是b」→ 合成
 *
 *   所以不需要扩维，只需要给这 3 类一个可视化的思考界面。
 *
 * 课程原文的铁律（实现必须遵守）：
 *   「当我们说 A 是 B 的时候，前面的 A 是小圈，后面的 B 是大圈。」
 *   「这个顺序一定不能画反了」
 *
 * 判定的本质（课程原文反复用同一句话表述）：
 *   「但在大圈里，既可能在小圈里，像黄点这个位置，也可能在小圈外，蓝点的位置。」
 *   黄点 = 结论主张的位置；蓝点 = 图上允许但结论未覆盖的位置。
 *   **蓝点存在 ⇒ 逻辑错误。**
 */

/** 圆的位置编码 —— 判定反例所在区域用 */
const ZONE = {
  INNER: 'inner',       // 小圈内（A 之内）
  RING: 'ring',         // 小圈外、大圈内
  OUTER: 'outer',       // 大圈外
};

// 四个区域的语义
const ZONE_MEANING = {
  [ZONE.INNER]: '小圈内 · 是 A',
  [ZONE.RING]: '小圈外大圈内 · 不是 A，但是 B',
  [ZONE.OUTER]: '大圈外 · 不是 B',
};

// 三个区域的正确性：作为「a 是 b」时哪些位置合法
const VALID_ZONES_FOR_AB = [ZONE.INNER];

// 唯一恒真式（课程原文）
// 「看到 a 是 b，那么我们一定可以推断出，非b 是 非a」
const ALWAYS_TRUE = {
  form: '非B 是 非A',
  from: 'A 是 B',
  desc: '不是 B 的东西，一定不是 A。这是唯一能确定推出来的方向。',
};

/**
 * 构造一个欧拉图配置
 *
 * @param {Object} input
 *   - innerName: 小圈名称（命题的前项 A）
 *   - outerName: 大圈名称（命题的后项 B）
 *   - subjectName: 讨论的主体（那个被归类的东西叫什么）
 *   - subjectZone: 主体落在哪个区域
 *   - conclusionZone: 结论声称主体落在哪个区域
 *   - conclusionText: 结论的文本
 * @returns 图层配置 + 判定结果
 */
function buildDiagram(input) {
  const {
    innerName,
    outerName,
    subjectName,
    subjectZone,
    conclusionZone,
    conclusionText,
  } = input;

  // 绘制参数（供 wxml/canvas 使用）
  const layers = {
    outer: { cx: 100, cy: 100, r: 78, label: outerName, kind: 'B' },
    inner: { cx: 100, cy: 100, r: 44, label: innerName, kind: 'A' },
    // 三个区域的坐标（相对图层中心）
    zones: {
      [ZONE.INNER]: { cx: 100, cy: 100 },
      [ZONE.RING]: { cx: 100, cy: 44 },
      [ZONE.OUTER]: { cx: 100, cy: 12 },
    },
  };

  // 判定：结论声称的区域是否必然成立
  // 若 subjectZone 是固定的（前提给定的），而 conclusionZone 与之矛盾 ⇒ 矛盾
  // 若结论声称了一个比前提更强的位置（如从 RING 断言 INNER 或 OUTER）⇒ 蓝点存在
  const claimIsForced = subjectZone === conclusionZone;
  const zoneValid = VALID_ZONES_FOR_AB.includes(conclusionZone);

  // 蓝点：结论声称的位置，在前提允许的范围内之外
  const counterExists = !zoneValid;

  return {
    layers,
    subject: { name: subjectName, zone: subjectZone },
    conclusion: {
      text: conclusionText,
      claimedZone: conclusionZone,
      zoneMeaning: ZONE_MEANING[conclusionZone],
    },
    // 判定
    claimIsForced,
    counterExists,
    counterZone: counterExists ? conclusionZone : null,
    verdict: counterExists ? 'invalid' : 'valid',
    // 供反馈文案使用
    explanation: counterExists
      ? `「${subjectName}」被放在${ZONE_MEANING[subjectZone]}，但结论说它在${ZONE_MEANING[conclusionZone]}。图上这个位置是允许的，所以结论推不出来。`
      : '结论声称的位置就是「${innerName} ⊆ ${outerName}」必然蕴含的，没有反例空间。',
  };
}

/**
 * 三大典型错误的形式化定义
 * 课程原文：
 *   「（1）看到 a 是 b，就错误的认为非a是非b」
 *   「（2）看到 a 是 b，就错误的认为 b 是 a」
 *   「（3）看到"有的 a 是 b"，就认为"a 都是 b"」
 */
const TYPICAL_ERRORS = {
  denying_antecedent: {
    key: 'denying_antecedent',
    name: '否定前件',
    courseForm: '看到 a 是 b，就认为 非a 是 非b',
    formal: 'A⊆B ⊬ ¬A⊆¬B',
    // 错误建图：把 RING 当成 OUTER
    subjectZone: ZONE.RING,
    claimedZone: ZONE.OUTER,
    why: '不是 A 的东西，仍然可能是 B。比如「不是主持人的孩子」不代表不需要学演讲。',
  },
  affirming_consequent: {
    key: 'affirming_consequent',
    name: '肯定后件',
    courseForm: '看到 a 是 b，就认为 b 是 a',
    formal: 'A⊆B ⊬ B⊆A',
    // 错误建图：把 RING 当成 INNER
    subjectZone: ZONE.RING,
    claimedZone: ZONE.INNER,
    why: '是 B 的东西，不一定是 A。比如「落后的国家」不一定有贫民窟。',
  },
  composition: {
    key: 'composition',
    name: '合成谬误',
    courseForm: '看到「有的 a 是 b」，就认为「a 都是 b」',
    formal: 'Some(A∧B) ⊬ ∀(A→B)',
    // 合成：从小圈内推到整个大圈
    subjectZone: ZONE.INNER,
    claimedZone: ZONE.INNER,
    special: 'partial_to_universal',
    why: '存在某个同时满足 A 和 B 的东西，不等于每一个 A 都满足 B。',
  },
};

/**
 * 生成一道欧拉图题
 *
 * @param {string} fallacyKey 形式组三类之一
 * @param {Object} context 具体语境（小圈名、大圈名、主体名）
 */
function buildEulerQuestion(fallacyKey, context) {
  const tpl = TYPICAL_ERRORS[fallacyKey];
  if (!tpl) {
    throw new Error('欧拉图仅适用于形式组：denying_antecedent / affirming_consequent / composition');
  }

  // 结论应声称什么（错的说法）
  const wrongClaim = tpl.key === 'composition'
    ? '所有${inner}都是${outer}'
    : `${subject}是${target}`;

  const diagram = buildDiagram({
    innerName: context.innerName,
    outerName: context.outerName,
    subjectName: context.subjectName,
    subjectZone: tpl.subjectZone,
    conclusionZone: tpl.claimedZone,
    conclusionText: context.conclusionText,
  });

  return {
    type: 'euler',
    fallacyKey,
    fallacyName: tpl.name,
    courseForm: tpl.courseForm,
    formal: tpl.formal,
    diagram,
    why: tpl.why,
    // 用户要回答的问题：结论声称的位置，图上是否允许？
    question: '结论说「' + context.subjectName + '」在${zoneLabel(diagram.conclusion.claimedZone)}，这个位置图上允许吗？',
    answer: diagram.counterExists ? 'allow' : 'deny',
    options: [
      {
        key: 'allow',
        name: '允许 · 结论推不出来',
        desc: '图上这个位置是合法的，所以结论没有必然性',
      },
      {
        key: 'deny',
        name: '不允许 · 结论成立',
        desc: '这个位置被前提排除了，结论必然成立',
      },
    ],
    alwaysTrue: ALWAYS_TRUE,
  };
}

function zoneLabel(zone) {
  return ZONE_MEANING[zone] || zone;
}

/**
 * 用户判定校验
 *
 * @param {Object} q buildEulerQuestion 的返回
 * @param {string} userPick allow | deny
 */
function evaluateEuler(q, userPick) {
  const correct = userPick === q.answer;
  return {
    correct,
    expected: q.answer,
    explanation: q.diagram.explanation,
    // 正确答案的反例位置
    counterZone: q.diagram.counterZone,
    why: q.why,
    courseForm: q.courseForm,
    formal: q.formal,
  };
}

/**
 * 方向错误检测 —— 课程专门强调这是最常见的错误
 *
 * 「把水果当成小圈，把苹果当成大圈。
 *   那意思就是，有些苹果不是水果，
 *   以及世界上除了苹果，就再没有其他种类的水果了。这就画错图了。」
 *
 * 研究员实测：6 张学员作业图中有 2 张把圈画反或画成交叠。
 * 这个错误真实存在且可区分度好，值得作为干扰项。
 */
function checkDirection(innerName, outerName) {
  return {
    innerLabel: innerName,
    outerLabel: outerName,
    rule: '当我们说 A 是 B 的时候，前面的 A 是小圈，后面的 B 是大圈。',
    consequence: '画反了，等于在说「有些 ${inner} 不是 ${outer}」，以及「除了 ${inner} 就没有 ${outer} 了」。',
  };
}

/**
 * 三步法（课程原文）
 * 「第一步，找到对方的理由和结论。
 *   第二步，我们把理由全都用图画出来。
 *   第三步，我们去观察这个图，看它是否必然和结论吻合。」
 */
const THREE_STEPS = [
  { step: 1, name: '找出理由和结论', desc: '结论是什么？支撑它的是哪几条理由？' },
  { step: 2, name: '把理由画出来', desc: 'A 是小圈，B 是大圈，前面的 A 小，后面的 B 大' },
  { step: 3, name: '看图是否必然吻合', desc: '图上有没有结论没覆盖的位置？有就是错的' },
];

module.exports = {
  ZONE,
  ZONE_MEANING,
  TYPICAL_ERRORS,
  ALWAYS_TRUE,
  THREE_STEPS,
  buildDiagram,
  buildEulerQuestion,
  evaluateEuler,
  checkDirection,
};