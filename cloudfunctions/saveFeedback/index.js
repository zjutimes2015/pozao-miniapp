// saveFeedback 云函数 —— 保存用户反馈
//
// 与本项目其他云函数的关键差异（必须理解，不要照抄 identity）：
//
//   identity：拿到 openid 但**不落库**、不出库，因为它服务于「零采集」定位。
//   saveFeedback：反馈闭环要求「同一用户多条反馈可归组」，因此 openid **必须落库**。
//   这是两种不同的合规判断，不是同一个模式 —— 前者回避身份，后者最小化使用身份。
//
// 设计要点：
//   1. OPENID 只从 cloud.getWXContext() 取，**前端传什么都不认**
//   2. 所有字段服务端二次校验（前端校验只为体验，不能作为唯一防线）
//   3. 限流 1 次 / 5 秒，防止刷库
//   4. 字段长度上限，防止超大文本撑爆集合
//   5. 默认写入 status / category / priority，便于后台按状态筛选

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const COLLECTION = 'feedback_items';

// ── 字段约束 ──
// 与前端 utils/feedback.js 的 FEEDBACK_TYPES 保持一致，两端都要有
const ALLOWED_TYPES = ['bug', 'suggestion', 'question', 'other'];
const ALLOWED_SOURCES = ['fingerprint', 'profile', 'solo', 'train', 'versus'];

const LIMITS = {
  content: 500,      // 与参考图 textarea 的 maxlength 一致
  contact: 100,
  pagePath: 120,
  sessionId: 64,
  typeCode: 32,
  source: 20,
};

// ── 限流：单用户 1 次 / 5 秒 ──
const RATE_LIMIT_MS = 5000;
const rateMap = new Map();

function checkRate(openid) {
  if (!openid) return true;
  const now = Date.now();
  const last = rateMap.get(openid);
  if (last && now - last < RATE_LIMIT_MS) return false;
  rateMap.set(openid, now);

  // 定期清理，防止内存泄漏
  if (rateMap.size > 5000) {
    for (const [k, v] of rateMap) {
      if (now - v > 60000) rateMap.delete(k);
    }
  }
  return true;
}

/** 截断为字符串并限长，去首尾空白 */
function clamp(value, max) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

/** 内容字段保留换行（用户可能分段描述） */
function clampMultiline(value, max) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[ \t]+/g, ' ').trim().slice(0, max);
}

exports.main = async (event) => {
  // ── 1. OPENID 只从服务端上下文取 ──
  // 前端即使传了 openid 也一律忽略，避免伪造他人身份写入反馈
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return { ok: false, code: 'NO_OPENID', message: '无法识别用户身份' };
  }

  // ── 2. 限流 ──
  if (!checkRate(OPENID)) {
    return { ok: false, code: 'RATE_LIMITED', message: '提交太频繁，请稍后再试' };
  }

  // ── 3. 校验 feedbackType（白名单，非法直接拒绝而非兜底）──
  const feedbackType = String(event && event.feedbackType || '');
  if (!ALLOWED_TYPES.includes(feedbackType)) {
    return {
      ok: false,
      code: 'INVALID_TYPE',
      message: '反馈类型只能是 bug / suggestion / question / other',
    };
  }

  // ── 4. 校验 content（非空 + 限长）──
  const content = clampMultiline(event.content, LIMITS.content);
  if (!content) {
    return { ok: false, code: 'EMPTY_CONTENT', message: '反馈内容不能为空' };
  }

  // ── 5. 可选字段规范化 ──
  let source = clamp(event.source, LIMITS.source);
  if (!ALLOWED_SOURCES.includes(source)) source = 'unknown';

  const now = Date.now();
  const doc = {
    // ── 用户提交的业务字段 ──
    feedbackType,
    content,
    contact: clamp(event.contact, LIMITS.contact),
    pagePath: clamp(event.pagePath, LIMITS.pagePath),
    sessionId: clamp(event.sessionId, LIMITS.sessionId),
    typeCode: clamp(event.typeCode, LIMITS.typeCode),
    source,
    createdAtMs: Number(event.createdAtMs) || now,

    // ── 服务端字段：OPENID 由 getWXContext 注入，前端无法伪造 ──
    openid: OPENID,

    // ── 默认状态字段：便于后台按状态筛选，无需为新反馈写脚本 ──
    status: 'new',
    category: 'unclassified',
    priority: 'normal',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  };

  try {
    const res = await db.collection(COLLECTION).add({ data: doc });
    return {
      ok: true,
      id: res._id,
      feedbackType: doc.feedbackType,
      createdAtMs: doc.createdAtMs,
    };
  } catch (e) {
    // 集合不存在时给出可执行的提示，而不是笼统失败
    const msg = String(e && e.errMsg || e && e.message || '');
    if (/collection.*not.*exist|-502005|DATABASE_COLLECTION_NOT_EXIST/i.test(msg)) {
      return {
        ok: false,
        code: 'COLLECTION_MISSING',
        message: '云数据库集合不存在，请先在开发者工具中创建 feedback_items',
      };
    }
    return { ok: false, code: 'DB_ERROR', message: '保存失败，请稍后再试' };
  }
};