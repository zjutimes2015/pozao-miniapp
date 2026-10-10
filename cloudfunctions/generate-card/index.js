// generate-card 云函数
// 生成可分享的指纹卡片图片
//
// 合规：
//   - 不含人格类型标签，只有能力倾向排序
//   - 必须展示免责声明
//   - 不含出生日期、不含命运预测、不含玄学表述
//
// 三级降级：云函数失败时前端降级为复制短代码文本，不阻断功能

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 免责声���（与前端 compliance.js 保持一致）
const DISCLAIMER = '本测评仅反映你当前的答题表现，不预测任何未来表现，不构成任何决策依据。';

// 合规自检：任何不合规内容直接拒绝生成
const FORBIDDEN = [
  '算命', '占卜', '运势', '命理', '排盘', '八字', '取名',
  '性格', '人格', '天生', '命中注定',
  '智商', '智力开发', '提升智商',
];

function isCompliant(text) {
  const lower = String(text || '').toLowerCase();
  for (const w of FORBIDDEN) {
    if (lower.includes(w.toLowerCase())) return false;
  }
  return true;
}

exports.main = async (event) => {
  const { code, fall, catchList, pattern } = event;

  // 合规校验：任一字段含禁用词则拒绝
  const allText = [
    ...(fall || []).map(x => x.name),
    ...(catchList || []).map(x => x.name),
    pattern || '',
  ].join(' ');

  if (!isCompliant(allText)) {
    return { ok: false, reason: 'content_not_compliant' };
  }

  // 生成卡片配置（前端负责绘制，此处返回数据与样式约束）
  const card = {
    code: code || 'PZ-0000',
    title: '我的论证指纹',
    fall: (fall || []).slice(0, 3),
    catch: (catchList || []).slice(0, 3),
    pattern: pattern || '',
    disclaimer: DISCLAIMER,
    // 视觉规范：浅色背景、深色文字、两个主色
    style: {
      bg: '#FCFCFA',
      text: '#1C1C1A',
      sub: '#5F5E5A',
      warn: '#E24B4A',
      strong: '#0F6E56',
      radius: 16,
    },
  };

  // 云存储路径
  const cloudPath = `cards/${code}.json`;
  try {
    await cloud.database().collection('pz_fingerprints').doc(code).set({
      data: { ...card, updatedAt: Date.now() },
    });
  } catch (e) {
    // 存库失败不影响卡片生成
  }

  return { ok: true, card, cloudPath };
};