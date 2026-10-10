// versus-service 云函数
// 同题对攻：创建房间 / 轮询 / 提交答案 / 结算检查
//
// 设计要点（Sailer & Homner 2020 元分析）：
//   竞争 + 协作结合 > 纯竞争。因此双方答案必须合并后才能交卷，
//   强制协作，避免变成纯竞争对抗。
//
// 合规：
//   - 不分享解锁任何内容
//   - 失败方也获得正向反馈（借鉴 Roblox All F Student 徽章设计）
//
// 容量保护：SBTI 死因之一是「服务器被挤成 404」，
//   故对单用户请求做限流：1 次 / 3 秒

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 单用户限流
const RATE_LIMIT_MS = 3000;
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

// 房间过期时间：10 分钟无活动即失效
const ROOM_TTL = 10 * 60 * 1000;

exports.main = async (event) => {
  const { action, roomId, openid, questionId, breakpoint } = event;

  if (!action) return { ok: false, reason: 'missing_action' };
  if (!checkRate(openid)) return { ok: false, reason: 'rate_limited' };

  switch (action) {
    case 'create': return await createRoom(openid, event.questionId);
    case 'poll': return await pollRoom(roomId, openid);
    case 'answer': return await submitAnswer(roomId, openid, questionId, breakpoint);
    case 'check': return await checkMerged(roomId, openid);
    default: return { ok: false, reason: 'unknown_action' };
  }
};

async function createRoom(openid, questionId) {
  const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();

  await db.collection('pz_rooms').doc(roomId).set({
    data: {
      hostId: openid || 'anonymous',
      hostAnswered: false,
      hostBreakpoint: null,
      guestId: null,
      guestAnswered: false,
      guestBreakpoint: null,
      // 题目 id 由客户端创建房间时指定（从30 道对攻题中随机抽一道）
      // 服务端不硬编码具体题目，否则会与客户端抽到的题目不一致
      questionId: questionId || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  });

  return { ok: true, roomId };
}

async function pollRoom(roomId, openid) {
  if (!roomId) return { ok: false, reason: 'missing_room' };

  try {
    const res = await db.collection('pz_rooms').doc(roomId).get();
    const room = res.data;

    // 房间过期
    if (Date.now() - room.updatedAt > ROOM_TTL) {
      return { ok: false, reason: 'room_expired' };
    }

    const opponentJoined = !!(room.guestId && room.guestId !== openid);

    return {
      ok: true,
      opponentJoined,
      questionId: room.questionId,
    };
  } catch (e) {
    return { ok: false, reason: 'room_not_found' };
  }
}

async function submitAnswer(roomId, openid, questionId, breakpoint) {
  if (!roomId || !breakpoint) return { ok: false, reason: 'invalid_params' };

  const res = await db.collection('pz_rooms').doc(roomId).get();
  const room = res.data;

  const isHost = room.hostId === openid || openid === 'anonymous';
  const update = {
    updatedAt: Date.now(),
  };

  if (isHost) {
    update.hostAnswered = true;
    update.hostBreakpoint = breakpoint;
  } else {
    update.guestId = openid;
    update.guestAnswered = true;
    update.guestBreakpoint = breakpoint;
  }

  await db.collection('pz_rooms').doc(roomId).update({ data: update });

  return { ok: true, submitted: true };
}

async function checkMerged(roomId, openid) {
  if (!roomId) return { ok: false, reason: 'missing_room' };

  const res = await db.collection('pz_rooms').doc(roomId).get();
  const room = res.data;

  const isHost = room.hostId === openid || openid === 'anonymous';
  const bothReady = room.hostAnswered && room.guestAnswered;

  return {
    ok: true,
    opponentAnswered: isHost ? room.guestAnswered : room.hostAnswered,
    opponentBreakpoint: isHost ? room.guestBreakpoint : room.hostBreakpoint,
    bothReady,
  };
}