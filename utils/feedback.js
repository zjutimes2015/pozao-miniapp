/**
 * utils/feedback.js —— 反馈闭环工具层
 *
 * 设计原则：
 *   1. 前端校验不是安全边界 —— 云函数 saveFeedback 会做同样的校验。
 *      两端都做，是为了让用户**立刻**看到错误，而不是等一次网络往返。
 *      因此这里的约束必须与云函数 LIMITS / ALLOWED_TYPES 完全一致。
 *   2. OFFLINE_FALLBACK —— 云开发不可用时不阻断用户。
 *      反馈降级写入本地存储，等网络恢复后再由后台任务补传。
 *      「反馈入口消失」比「反馈晚点到」严重得多。
 *   3. 合规 —— 用户输入的 content 必须过 compliance.checkText，
 *      不因为是用户输入就豁免（防用户自己写下违规内容导致整站被扫）。
 */

/**
 * 反馈类型白名单 —— 与云函数 ALLOWED_TYPES 一致
 * 不允许自行扩充：后台按固定四类处理，扩展类型需同步改云函数。
 */
const FEEDBACK_TYPES = [
  {
    key: 'bug',
    label: '问题',
    desc: '页面错误、结果异常',
  },
  {
    key: 'suggestion',
    label: '建议',
    desc: '想要的新体验',
  },
  {
    key: 'question',
    label: '疑问',
    desc: '规则或结果看不懂',
  },
  {
    key: 'other',
    label: '其他',
    desc: '先记下来',
  },
];

const TYPE_KEYS = FEEDBACK_TYPES.map(t => t.key);

/** 字段上限 —— 与云函数 LIMITS 一致 */
const LIMITS = {
  content: 500,
  contact: 100,
  pagePath: 120,
  sessionId: 64,
  typeCode: 32,
  source: 20,
};

/** 反馈来源白名单 —— 与云函数 ALLOWED_SOURCES 一致 */
const ALLOWED_SOURCES = ['fingerprint', 'profile', 'solo', 'train', 'versus'];

/** 本地补传队列的存储键 */
const PENDING_KEY = 'pz_feedback_pending';

/**
 * 校验反馈表单
 *
 * @returns {{ok: boolean, errors: Object, data: Object|null}}
 */
function validateFeedback(input) {
  const src = input || {};
  const errors = {};

  const type = String(src.feedbackType || '');
  if (!type) {
    errors.feedbackType = '请选择一个类型';
  } else if (!TYPE_KEYS.includes(type)) {
    errors.feedbackType = '类型不合法';
  }

  const content = String(src.content || '').replace(/[ \t]+/g, ' ').trim();
  if (!content) {
    errors.content = '请写点具体内容';
  } else if (content.length > LIMITS.content) {
    errors.content = `最多 ${LIMITS.content} 字，当前 ${content.length} 字`;
  }

  const contact = String(src.contact || '').trim();
  // 联系方式是可选的，但填了就要像个联系方式 —— 只做宽松校验，不做严格格式限制
  // （邮箱/微信号/手机号格式各异，误杀的成本高于收益）
  if (contact.length > LIMITS.contact) {
    errors.contact = `最多 ${LIMITS.contact} 字`;
  }

  let source = String(src.source || '');
  if (!ALLOWED_SOURCES.includes(source)) source = 'unknown';

  if (errors.feedbackType || errors.content || errors.contact) {
    return { ok: false, errors, data: null };
  }

  return {
    ok: true,
    errors,
    data: {
      feedbackType: type,
      content,
      contact,
      pagePath: String(src.pagePath || '').slice(0, LIMITS.pagePath),
      sessionId: String(src.sessionId || '').slice(0, LIMITS.sessionId),
      typeCode: String(src.typeCode || '').slice(0, LIMITS.typeCode),
      source,
      createdAtMs: Number(src.createdAtMs) || Date.now(),
    },
  };
}

/**
 * 提交反馈到云函数
 *
 * @param {Object} form 表单内容（不含 openid —— 服务端会自己取）
 * @returns {Promise<{ok: boolean, id?: string, code?: string, message: string}>}
 */
function submitFeedbackToCloud(form) {
  const checked = validateFeedback(form);
  if (!checked.ok) {
    const first = Object.values(checked.errors)[0] || '表单填写有误';
    return Promise.resolve({ ok: false, code: 'INVALID_FORM', message: first });
  }

  const payload = checked.data;

  // 合规过滤：用户输入同样要过禁用词
  // 理由 —— 若用户自己写违规内容入库，审核时整站被扫，责任在平台
  const compliance = require('./compliance.js');
  const safe = compliance.checkText(payload.content);
  if (!safe.safe) {
    return Promise.resolve({
      ok: false,
      code: 'COMPLIANCE',
      message: `内容包含不合适用词：${safe.hits.map(h => h.word).join('、')}`,
    });
  }

  // 云开发不可用时降级为本地队列
  const app = getApp();
  if (!app || !app.globalData || !app.globalData.cloudReady) {
    return Promise.resolve(enqueueLocally(payload));
  }

  return wx.cloud.callFunction({
    name: 'saveFeedback',
    data: payload,
  }).then((res) => {
    const r = (res && res.result) || {};
    if (r.ok) {
      return { ok: true, id: r.id, message: '已收到，谢谢你的反馈' };
    }
    return {
      ok: false,
      code: r.code || 'UNKNOWN',
      message: r.message || '提交失败，请稍后再试',
    };
  }).catch(() => {
    // 网络异常也不阻断 —— 进本地队列
    return enqueueLocally(payload);
  });
}

/**
 * 降级：写入本地待传队列
 *
 * 为什么要有这个：
 *   反馈入口一旦因为云服务不可用而报错，用户会认为产品坏了，
 *   体验损失远大于「反馈晚点到达」。
 */
function enqueueLocally(payload) {
  try {
    const pending = wx.getStorageSync(PENDING_KEY) || [];
    pending.push({ ...payload, queuedAtMs: Date.now() });
    // 最多留 20 条，避免无限制增长
    wx.setStorageSync(PENDING_KEY, pending.slice(-20));
  } catch (e) {
    // 存储都失败则彻底放弃，但不抛错打断用户
  }
  return {
    ok: false,
    code: 'QUEUED',
    message: '已记录，网络恢复后会自动提交',
  };
}

/**
 * 取出待传队列
 * 由「我的」页在启动时调用，尝试补传历史反馈
 *
 * @returns {Promise<{sent: number, remain: number}>}
 */
function flushPendingFeedback() {
  let pending = [];
  try {
    pending = wx.getStorageSync(PENDING_KEY) || [];
  } catch (e) {
    return Promise.resolve({ sent: 0, remain: 0 });
  }

  if (!pending.length) {
    return Promise.resolve({ sent: 0, remain: 0 });
  }

  const app = getApp();
  if (!app || !app.globalData || !app.globalData.cloudReady) {
    return Promise.resolve({ sent: 0, remain: pending.length });
  }

  let sent = 0;
  const chain = pending.reduce((acc, item) => acc.then(() => {
    // 队列里的旧数据不再过期限校验 —— 它们提交时是合法的
    return wx.cloud.callFunction({
      name: 'saveFeedback',
      data: item,
    }).then((res) => {
      if (res && res.result && res.result.ok) sent += 1;
    }).catch(() => { /* 单条失败不阻断后续 */ });
  }), Promise.resolve());

  return chain.then(() => {
    const remain = pending.length - sent;
    try {
      if (remain <= 0) {
        wx.removeStorageSync(PENDING_KEY);
      } else {
        wx.setStorageSync(PENDING_KEY, pending.slice(-remain));
      }
    } catch (e) { /* ignore */ }
    return { sent, remain };
  });
}

module.exports = {
  FEEDBACK_TYPES,
  TYPE_KEYS,
  LIMITS,
  ALLOWED_SOURCES,
  PENDING_KEY,
  validateFeedback,
  submitFeedbackToCloud,
  flushPendingFeedback,
};