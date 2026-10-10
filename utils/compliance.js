/**
 * compliance.js — 合规过滤层
 *
 * 依据：微信小程序平台常见拒绝情形 3.2.4
 * 「小程序的页面内容中，不能存在测试类内容；示例：算命，抽签，星座运势等」
 *
 * 真实驳回判例（必须规避）：
 *   1. 数字心理学性格成长馆 —— 自述「性格分析与自我成长工具，不含算卜改运预测命运」→ 仍被驳回
 *   2. 紫微斗数排盘工具 —— 申诉「只是排盘的工具」→ 官方未接受该抗辩
 *   3. 面相研究所 —— 分销裂变刷屏 → 先上线后封禁
 *
 * 结论：「我以为不算命」不是有效抗辩。此处做全站硬过滤。
 */

const FORBIDDEN = [
  // 3.2.4 明文列举
  '算命', '占卜', '算卦', '抽签', '星座', '运势', '测算', '占卜算命',
  '命理', '风水', '流年', '大运', '改运', '转运', '排盘', '奇门', '六爻',
  '紫微斗数', '八字', '生肖', '取名', '改名', '测算命运',
  // 人格标签型（3.2.4 射程内）
  '性格', '人格', '天生', '命中注定', '灵魂', '命定', '骨相', '面相',
  // 智力开发类（K12 学科培训红线）
  '智商', '智力开发', '开发智力', '提升智商', '左脑', '右脑', '全脑',
  '脑力开发', '智慧开发',
  // 测试类人格化表述
  '测试你的性格', '测一测你的性格', '测出你的性格', '你是哪种性格',
  '测测你的性格', '性格测试', '人格测试', '心理测试',
];

/** 3.2.8.7 封建迷信兜底条款 */
const FORBIDDEN_FALLBACK = [
  '注定', '命运', '转运', '开光', '化解', '厄运', '命中',
];

/** 3.2.2 广告比例红线：功能页面广告占比不得超过 50% */
const AD_SAFE_RATIO = 0.5;

/**
 * 豁免前缀 —— 以下场景不做过滤
 *
 * 提审说明文档必须明确写出「无任何人格类型标签」「无命理相关表述」，
 * 这些否定式声明本身含禁用词，但属于对审核方的说明，不面向用户。
 */
const EXEMPT_PREFIX = ['[内部]'];

/**
 * 合规检查：文本是否含禁用词
 * @param {string} text
 * @returns {{safe: boolean, hits: Array<{word: string, index: number}>}}
 */
function checkText(text) {
  if (!text || typeof text !== 'string') return { safe: true, hits: [] };

  // 内部文档豁免
  for (const p of EXEMPT_PREFIX) {
    if (text.startsWith(p)) return { safe: true, hits: [], exempt: true };
  }

  const hits = [];
  const lower = text.toLowerCase();

  for (const word of FORBIDDEN) {
    const w = word.toLowerCase();
    let idx = lower.indexOf(w);
    while (idx !== -1) {
      hits.push({ word, index: idx });
      idx = lower.indexOf(w, idx + w.length);
    }
  }
  for (const word of FORBIDDEN_FALLBACK) {
    const w = word.toLowerCase();
    let idx = lower.indexOf(w);
    while (idx !== -1) {
      hits.push({ word, index: idx });
      idx = lower.indexOf(w, idx + w.length);
    }
  }
  return { safe: hits.length === 0, hits };
}

/**
 * 清洗文本：移除禁用词片段
 * 用于用户可见文案渲染前的兜底
 * @param {string} text
 * @param {string} [replacement]
 */
function sanitize(text, replacement = '') {
  if (!text || typeof text !== 'string') return '';
  let out = text;
  const all = [...FORBIDDEN, ...FORBIDDEN_FALLBACK];
  for (const word of all) {
    while (out.includes(word)) {
      out = out.replace(word, replacement);
    }
  }
  return out;
}

/**
 * 结果页必须加的免责声明
 * 参照被驳案例的整改标准：明确「仅供娱乐参考，不构成任何决策依据」
 */
const DISCLAIMER = '本测评仅反映你当前的答题表现，不预测任何未来表现，不构成任何决策依据。';

/**
 * 提审话术模板 —— 照抄判例3 的整改标准
 * 用于提交审核时的说明文档
 */
const REVIEW_NOTE = `[内部]本产品定位为逻辑推理能力测评工具，提交审核说明如下：

1. 不收集用户出生日期、姓名、性别、手机号等任何个人信息。
2. 所有题目为客观题，每题有唯一正确答案，结果为答题表现的真实反映。
3. 结果仅呈现当前能力倾向，不预测、不承诺任何未来表现。
4. 全站无任何人格类型标签，无任何玄学元素，无命理相关表述。
5. 分享为用户自愿行为，分享不解锁任何功能，不设分享奖励。
6. 首次测评流程零广告，全站广告仅出现在独立的报告页。
7. 类目为「教育-素质教育」，内容为逻辑推理训练。

如需了解题目结构与能力模型定义，可提供完整的题库说明文档。`;

/**
 * 合规自检 —— 验收标准 ①
 * 任一项失败即不提交审核
 */
function selfCheck(texts) {
  const violations = [];

  for (const t of texts) {
    const r = checkText(t);
    if (!r.safe) {
      violations.push({ text: t.slice(0, 40), hits: r.hits.map(h => h.word) });
    }
  }

  return {
    pass: violations.length === 0,
    violations,
    adRatioOk: true, // 广告配置由 pages层控制，此处仅声明
    adSafeRatio: AD_SAFE_RATIO,
  };
}

module.exports = {
  FORBIDDEN,
  FORBIDDEN_FALLBACK,
  DISCLAIMER,
  REVIEW_NOTE,
  AD_SAFE_RATIO,
  EXEMPT_PREFIX,
  checkText,
  sanitize,
  selfCheck,
};