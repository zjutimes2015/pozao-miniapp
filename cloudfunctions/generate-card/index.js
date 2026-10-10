// generate-card 云函数 —— 仅做合规自检与可选存档
//
// 设计变更说明（v0.2）：
//   原本此函数负责生成卡片图片，现改为**卡片由小程序端 canvas 本地绘制**。
//   原因：
//     1. canvas 本地绘制不依赖网络，离线可用，响应更快
//     2. 卡片内容完全由本地数据决定，不存在上传隐私风险
//     3. 少一次网络往返
//
//   本函数保留的职责：
//     - 服务端二次合规校验（客户端可能被篡改）
//     - 可选的匿名存档，用于后续统计分享效果
//
//   注意：存档只写 code 与聚合分数，不写 openid、不写任何可识别信息。

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const DISCLAIMER = '本测评仅反映你当前的答题表现，不预测任何未来表现，不构成任何决策依据。';

// 服务端独立维护一份禁用词（不复用客户端代码，避免被篡改后失效）
const FORBIDDEN = [
  '算命', '占卜', '运势', '命理', '排盘', '八字', '取名', '测算',
  '性格', '人格', '天生', '命中注定', '灵魂', '命定',
  '智商', '智力开发', '提升智商', '左脑', '右脑',
];

function isCompliant(text) {
  const lower = String(text || '').toLowerCase();
  for (const w of FORBIDDEN) {
    if (lower.includes(w.toLowerCase())) return false;
  }
  return true;
}

exports.main = async (event) => {
  const { code, groups, pattern, optInArchive } = event;

  // 服务端二次合规校验：任一字段含禁用词即拒绝
  const allText = [
    ...(groups || []).map(g => (g && g.name) || ''),
    pattern || '',
  ].join(' ');

  if (!isCompliant(allText)) {
    return {
      ok: false,
      reason: 'content_not_compliant',
      message: '卡片内容含平台未允许表述，已阻止生成',
    };
  }

  // 校验通过。默认不存档——需用户显式选择
  let archived = false;
  if (optInArchive === true && code) {
    try {
      await cloud.database().collection('pz_fingerprints').doc(code).set({
        data: {
          groups: (groups || []).map(g => ({
            key: g.key,
            fallRate: g.fallRate,
            catchRate: g.catchRate,
            total: g.total,
          })),
          // 只存聚合分数与短代码，不存任何用户标识
          updatedAt: Date.now(),
        },
      });
      archived = true;
    } catch (e) {
      // 存档失败不影响卡片生成
      archived = false;
    }
  }

  return {
    ok: true,
    verified: true,
    archived,
    disclaimer: DISCLAIMER,
  };
};