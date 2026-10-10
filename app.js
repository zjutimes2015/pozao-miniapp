/**
 * app.js — 全局状态管理
 *
 * 设计原则：
 *   1. 零门槛 —— 进入即可玩，不要求注册、不收集手机号
 *   2. 本地优先 —— 答题与指纹计算全在本地，网络不可用时功能完整
 *   3. 三级降级 —— 云函数 → 本地规则引擎 → 静态兜底
 */

const { computeFingerprint, fingerprintCode, describePattern } = require('./utils/argue-engine.js');
const { DISCLAIMER } = require('./utils/compliance.js');

App({
  globalData: {
    logs: [],
    session: null,
    fingerprint: null,
    disclaimer: DISCLAIMER,
    openid: '',
    cloudReady: false,
  },

  onLaunch() {
    // 云开发必须在任何 callFunction 之前初始化，否则真机直接报错
    if (!wx.cloud) {
      console.error('[app] 当前基础库不支持云开发，对攻与卡片功能不可用');
    } else {
      wx.cloud.init({
        env: 'YOUR_ENV_ID',   // ← 部署时替换为你的云开发环境 ID
        traceUser: false,     // 不上报用户轨迹，符合「零采集」定位
      });
      this.globalData.cloudReady = true;
    }

    this.loadLogs();
    this.fetchOpenid();

    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        onSuccess: (res) => {
          this.globalData.privacyAuthorized = res.needAuthorization;
        },
      });
    }
  },

  /**
   * 获取 openid —— 对攻房间用它区分房主与对手
   *
   * 设计取舍：为了「不采集用户信息」，这里不申请用户身份授权，
   * 而是由云函数返回一个**匿名房间标识**用于房间归属判定。
   * openid 只在服务端内存中作为房间归属标记，不落库、不出库。
   */
  fetchOpenid() {
    return new Promise((resolve) => {
      if (!this.globalData.cloudReady) {
        // 云开发不可用时用本地随机 id，保证单机可玩
        let localId = wx.getStorageSync('pz_local_id');
        if (!localId) {
          localId = 'L' + Math.random().toString(36).slice(2, 10);
          wx.setStorageSync('pz_local_id', localId);
        }
        this.globalData.openid = localId;
        return resolve(localId);
      }

      wx.cloud.callFunction({
        name: 'identity',
        data: {},
      }).then((res) => {
        const id = (res.result && res.result.anonId) || '';
        this.globalData.openid = id;
        resolve(id);
      }).catch(() => {
        let localId = wx.getStorageSync('pz_local_id');
        if (!localId) {
          localId = 'L' + Math.random().toString(36).slice(2, 10);
          wx.setStorageSync('pz_local_id', localId);
        }
        this.globalData.openid = localId;
        resolve(localId);
      });
    });
  },

  /** 读取本地答题日志 */
  loadLogs() {
    try {
      const logs = wx.getStorageSync('pz_logs');
      this.globalData.logs = Array.isArray(logs) ? logs : [];
    } catch (e) {
      this.globalData.logs = [];
    }
    return this.globalData.logs;
  },

  /** 保存一条答题日志 */
  addLog(entry) {
    const logs = this.globalData.logs.concat(entry);
    this.globalData.logs = logs;
    try {
      wx.setStorageSync('pz_logs', logs);
    } catch (e) {
      // 存储失败不应阻断答题，降级为内存态
    }
    this.globalData.fingerprint = null;
    return logs.length;
  },

  /** 清空全部数据（隐私设置里提供入口） */
  clearAll() {
    this.globalData.logs = [];
    this.globalData.fingerprint = null;
    try {
      wx.removeStorageSync('pz_logs');
      wx.removeStorageSync('pz_session');
    } catch (e) {
      // ignore
    }
  },

  /**
   * 计算连续训练天数
   *
   * 关键修复：不能用 toDateString() 做排序。
   * toDateString() 返回如 "Sat Oct 10 2026"，按字母排序时
   * "Oct 10" 会排在 "Oct 08" 之前，导致连续天数算错。
   * 必须归一化为 YYYY-MM-DD 数字键再排序。
   *
   * 断签策略依据 Lally et al. (2010, N=96)：
   * 漏一次执行不会实质性影响习惯形成，伤害来自中断后的放弃。
   * 因此允许漏一天，后续恢复即继续。
   */
  computeStreak(logs) {
    const dayKey = (ts) => {
      const d = new Date(ts);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${m}-${day}`;
    };

    if (!logs || !logs.length) return { days: 0, recoverable: true };

    const days = [...new Set(logs.map(l => dayKey(l.ts)))].sort().reverse();
    let streak = 1;
    let sawGap = false;

    for (let i = 1; i < days.length; i++) {
      const diff = Math.round(
        (new Date(days[i - 1]) - new Date(days[i])) / 86400000
      );
      if (diff === 1) {
        streak++;
      } else if (diff === 2 && !sawGap) {
        // 漏一天：可恢复，streak 继续
        streak++;
        sawGap = true;
      } else {
        break;
      }
    }

    return { days: streak, recoverable: true };
  },

  /** 计算当前指纹（带缓存） */
  getFingerprint() {
    if (this.globalData.fingerprint) return this.globalData.fingerprint;

    const fp = computeFingerprint(this.globalData.logs);
    const pattern = describePattern(fp);

    const result = {
      ...fp,
      code: fp.complete && fp.sampleSufficient ? fingerprintCode(fp) : null,
      pattern,
      totalAnswers: this.globalData.logs.length,
    };

    this.globalData.fingerprint = result;
    return result;
  },

  /** 开始一次单闯会话 */
  startSolo(levelIds) {
    this.globalData.session = {
      mode: 'solo',
      levelIds,
      current: 0,
      startedAt: Date.now(),
      answers: [],
    };
    return this.globalData.session;
  },

  /** 记录一次作答 */
  recordAnswer(payload) {
    const s = this.globalData.session;
    if (!s) return null;
    s.answers.push(payload);
    return s.answers.length;
  },

  /** 结束会话并写入日志 */
  finishSession() {
    const s = this.globalData.session;
    if (!s) return 0;
    let count = 0;
    for (const a of s.answers) {
      this.addLog({
        ts: Date.now(),
        levelId: a.levelId,
        fallacyKey: a.fallacyKey,
        correct: a.correct,
        fellInto: !a.correct,
        mode: 'solo',
        durationMs: a.durationMs || 0,
      });
      count++;
    }
    this.globalData.session = null;
    return count;
  },
});