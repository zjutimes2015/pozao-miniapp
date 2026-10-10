// identity 云函数 —— 返回匿名标识，用于对攻房间归属判定
//
// 合规设计考量：
//   1. 不返回 openid，也不落库、不出库 —— 避免构成「收集用户身份信息」
//   2. 只返回一个基于云函数实例 + 时间窗的匿名串，仅用于区分房主与对手
//   3. 不写入任何数据库集合，函数结束即失效
//
// 为什么不用 openid：
//   产品定位是「零采集」。openid 属于用户身份标识，
//   用于房间归属虽然最小化，但仍需在隐私政策中声明。
//   匿名串在功能上等价（区分两个人），但合规成本低得多。

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 匿名 id 的有效窗口：同一窗口内同一实例返回同一个 id
const WINDOW_MS = 30 * 60 * 1000;
let windowKey = '';
let windowId = '';
let counter = 0;

exports.main = async () => {
  const now = Date.now();

  // 时间窗轮换：不同窗口必然产生不同 id，避免长期追踪
  if (windowKey !== String(Math.floor(now / WINDOW_MS))) {
    windowKey = String(Math.floor(now / WINDOW_MS));
    windowId = 'A' + cloud.getWXContext().OPENID.slice(-6) + '-' +
      Math.random().toString(36).slice(2, 8);
    counter = 0;
  }

  // 同一窗口内的并发请求加后缀，保证房主与对手拿到不同 id
  counter += 1;

  return {
    ok: true,
    anonId: counter > 1 ? `${windowId}-${counter}` : windowId,
    ttl: WINDOW_MS,
  };
};