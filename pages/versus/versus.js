/** 对攻页 — 同题协作+竞争
 *
 * 设计依据：Sailer & Homner (2020) 元分析发现「竞争+协作结合」
 * 比纯竞争有效。因此双方答案必须合并后才能交卷，强制协作。
 *
 * 合规注释：邀请为用户自愿发起，不设任何奖励，也不带来功能增益
 */

const app = getApp();
const soloBank = require('../../data/levels.js');
const versusBank = require('../../data/versus-bank.js');
const { FALLACIES } = require('../../utils/argue-engine.js');

Page({
  data: {
    roomId: '',
    code: '',
    status: 'idle',        // idle | waiting | ready | finished
    opponentCode: '',
    question: null,
    myBreakpoint: null,
    opponentBreakpoint: null,
    myAnswered: false,
    opponentAnswered: false,
    result: null,
    mergedComplete: false,
    myFallacy: null,
    fallacyOptions: [],
  },

  onLoad(query) {
    this.setData({ code: query.code || '' });
    this.pollTimer = null;
    // 谬误选项：与单闯页保持一致
    this.setData({
      fallacyOptions: Object.values(FALLACIES).map(f => ({
        key: f.key, name: f.name, group: f.group,
      })),
    });
  },

  onUnload() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  },

  /** 创建房间 */
  async onCreateRoom() {
    // 先抽题，再把题目 id 传给服务端，保证双方看到同一道
    this.pickedId = null;
    this.loadQuestion();

    // 必须等 openid 就绪，否则服务端无法区分房主与对手
    const anonId = await this.getOpenid();
    if (!anonId) {
      wx.showToast({ title: '初始化失败，请稍后再试', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '创建中' });
    wx.cloud.callFunction({
      name: 'versus-service',
      data: {
        action: 'create',
        openid: anonId,
        questionId: this.pickedId,
      },
    }).then((res) => {
      wx.hideLoading();
      const roomId = res.result && res.result.roomId;
      if (!roomId) {
        wx.showToast({ title: '创建失败，稍后再试', icon: 'none' });
        return;
      }
      this.setData({ roomId, status: 'waiting' });
      this.startPolling();
      this.inviteOpponent();
    }).catch(() => {
      wx.hideLoading();
      // 降级：网络不可用时不阻断，给出手动邀请码
      wx.showToast({ title: '网络不可用，稍后再试', icon: 'none' });
    });
  },

  /** 邀请对手 —— 双路径，不依赖微信入口识别能力 */
  inviteOpponent() {
    const text = `我在这道题上卡住了，敢不敢来拆同一段话？房间号 ${this.data.roomId}`;
    wx.showActionSheet({
      itemList: ['复制房间号', '生成邀请卡片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.setClipboardData({ data: text });
        } else {
          wx.setClipboardData({ data: this.data.roomId });
          wx.showToast({ title: '房间号已复制，可发送给好友', icon: 'none' });
        }
      },
    });
  },

  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(async () => {
      const anonId = await this.getOpenid();
      if (!anonId) return;
      wx.cloud.callFunction({
        name: 'versus-service',
        data: { action: 'poll', roomId: this.data.roomId, openid: anonId },
      }).then((res) => {
        const r = res.result || {};
        if (r.opponentJoined && this.data.status === 'waiting') {
          this.setData({ status: 'ready', opponentCode: r.opponentCode });
          this.loadQuestion();
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
      }).catch(() => {});
    }, 2000);
  },

  loadQuestion() {
    // 从 30 道对攻题中随机抽一道，双方看到同一道
    // 避免每次都是同一道题（用户会背答案）
    if (!this.pickedId) {
      const pool = versusBank.questions;
      this.pickedId = pool[Math.floor(Math.random() * pool.length)].id;
    }
    const q = versusBank.questions.find(x => x.id === this.pickedId)
      || versusBank.questions[0];
    this.setData({ question: q });
  },

  onCardTap(e) {
    if (this.data.myAnswered) return;
    this.setData({ myBreakpoint: e.currentTarget.dataset.id });
  },

  /** 选择谬误类型 —— 必须由用户作答，不能把正确答案传给后端 */
  onFallacyTap(e) {
    if (this.data.myAnswered) return;
    this.setData({ myFallacy: e.currentTarget.dataset.key });
  },

  async onSubmit() {
    const { question, myBreakpoint, myFallacy } = this.data;
    if (!myBreakpoint || !myFallacy) return;

    const anonId = await this.getOpenid();
    if (!anonId) {
      wx.showToast({ title: '网络异常，请稍后再试', icon: 'none' });
      return;
    }

    wx.cloud.callFunction({
      name: 'versus-service',
      data: {
        action: 'answer',
        roomId: this.data.roomId,
        openid: anonId,
        questionId: question.id,
        breakpoint: {
          from: myBreakpoint,
          to: question.cards.find(c => c.type === 'conclusion').id,
          fallacy: myFallacy,
        },
      },
    }).then(() => {
      this.setData({ myAnswered: true });
      this.checkMerged();
    });
  },

  /** 双方答案合并后才能交卷 —— 强制协作 */
  async checkMerged() {
    if (!this.data.myAnswered) return;
    const anonId = await this.getOpenid();
    if (!anonId) return;
    wx.cloud.callFunction({
      name: 'versus-service',
      data: { action: 'check', roomId: this.data.roomId, openid: anonId },
    }).then((res) => {
      const r = res.result || {};
      this.setData({
        opponentAnswered: r.opponentAnswered,
        opponentBreakpoint: r.opponentBreakpoint,
        mergedComplete: r.bothReady,
      });
      if (r.bothReady) {
        this.settle();
      }
    });
  },

  settle() {
    const { question, myBreakpoint, myFallacy, opponentBreakpoint } = this.data;
    const bp = question.breakpoint;

    // 双重判定：断点位置对不对 + 谬误类型对不对
    const iRightFrom = myBreakpoint === bp.from;
    const iRightType = myFallacy === bp.fallacy;
    const iAmRight = iRightFrom && iRightType;

    const oppFrom = opponentBreakpoint && opponentBreakpoint.from;
    const oppType = opponentBreakpoint && opponentBreakpoint.fallacy;
    const oppRight = oppFrom === bp.from && oppType === bp.fallacy;

    this.setData({
      status: 'finished',
      result: {
        iFoundIt: iAmRight,
        oppFoundIt: oppRight,
        iRightFrom,
        iRightType,
        oppRight,
        rightFrom: bp.from,
        rightFallacy: bp.fallacy,
        rightFallacyName: (FALLACIES[bp.fallacy] || {}).name || bp.fallacy,
        truth: question.groundTruth,
        why: bp.why,
        // 失败方也得到正向反馈：抓到了 = 有效识别
        verdict: iAmRight
          ? (oppRight ? '你们都抓到了。' : '你抓到了，对手没看到。')
          : (oppRight ? '对手抓到了，你没有。' : '你们都没抓到——这题的断点比较隐蔽。'),
        // 细分反馈：告诉用户错在哪一环
        missDetail: iAmRight ? '' : (!iRightFrom
          ? '断点位置找错了。'
          : '位置对了，但谬误类型判断错了。'),
      },
    });

    // 无论胜负都写入日志，计入刻度
    app.addLog({
      ts: Date.now(),
      levelId: 0,
      fallacyKey: question.fallacyKey,
      correct: iAmRight,
      fellInto: !iAmRight,
      mode: 'versus',
      durationMs: 0,
    });
  },

  onAgain() {
    this.pickedId = null;
    this.setData({
      status: 'idle', question: null, myBreakpoint: null, myFallacy: null,
      opponentBreakpoint: null, myAnswered: false,
      opponentAnswered: false, result: null, mergedComplete: false,
      roomId: '',
    });
  },

  getOpenid() {
    // app.js 的 fetchOpenid 返回 Promise，确保拿到值再发请求
    if (!app.globalData.openidPromise) {
      app.globalData.openidPromise = app.fetchOpenid();
    }
    return app.globalData.openidPromise;
  },
});