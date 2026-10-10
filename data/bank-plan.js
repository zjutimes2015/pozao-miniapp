/**
 * 题库分配方案
 *
 * 总目标 65 题 = 叙事 15 + 对攻 30 + 周轮换 20
 *
 * 设计依据：
 *   1. 指纹采用「分组聚合」统计，组内各题必须均衡，
 *      否则形式/论证/语义三组的样本量差异过大会影响聚合分数
 *   2. minSamples=3 意味着单维至少要 3 题才有统计意义
 *   3. 对攻题需要「断点更隐蔽」，轮换题需要「场景更日常」
 *
 * 分配表（每维最终题数）：
 *   维度              叙事  对攻  轮换  合计
 *   1. 肯定后件          2    3     2     7
 *   2. 否定前件          1    3     2     6
 *   3. 合成谬误          1    3     1     5
 *   4. 归谬              1    3     1     5
 *   5. 诉诸无知          1    2     2     5
 *   6. 诉诸权威          1    2     2     5
 *   7. 诉诸大众          1    3     1     5
 *   8. 诉诸情感          1    2     2     5
 *   9. 偷换概念          1    3     2     6
 *  10. 滑坡谬误          2    2     2     6
 *  11. 稻草人            1    2     1     4
 *  12. 归因谬误2    2     6
 *   ────────────────────────────────────
 *   合计15   30    20    65
 *
 * 分组均衡校验：
 *   形式组（1-4）  = 7+6+5+5 = 23
 *   论证组（5-8）  = 5+5+5+5 = 20
 *   语义组（9-12） = 6+6+4+6 = 22
 *   三组极差 = 3，占比 23:20:22 —— 均衡
 */

module.exports = {
  TOTAL: 65,
  SOLO: 15,
  VERSUS: 30,
  ROTATION: 20,

  // 对攻题分布：每维 2-3 道
  versus: {
    affirming_consequent: 3,
    denying_antecedent: 3,
    composition: 3,
    reductio: 3,
    appeal_ignorance: 2,
    appeal_authority: 2,
    appeal_popularity: 3,
    appeal_emotion: 2,
    equivocation: 3,
    slippery_slope: 2,
    strawman: 2,
    false_cause: 2,
  },

  // 周轮换分布：每维 1-2 道
  rotation: {
    affirming_consequent: 2,
    denying_antecedent: 2,
    composition: 1,
    reductio: 1,
    appeal_ignorance: 2,
    appeal_authority: 2,
    appeal_popularity: 1,
    appeal_emotion: 2,
    equivocation: 2,
    slippery_slope: 2,
    strawman: 1,
    false_cause: 2,
  },
};