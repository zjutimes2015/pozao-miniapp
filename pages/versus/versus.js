/** 对攻页 — 同题协作+竞争
 *
 * 设计依据：Sailer & Homner (2020) 元分析发现「竞争+协作结合」
 * 比纯竞争有效。因此双方答案必须合并后才能交卷，强制协作。
 *
 * 合规注释：邀请为用户自愿发起，不设任何奖励，也不带来功能增益
 */

const app = getApp();
const bank = require('../../data/levels.js');

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
  },

  onLoad(query) {
    this.setData({ code: query.code || '' });
    this.pollTimer = null;
  },

  onUnload() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  },

  /** 创建房间 */
  onCreateRoom() {
    wx.showLoading({ title: '创建中' });
    wx.cloud.callFunction({
      name: 'versus-service',
      data: { action: 'create', openid: this.getOpenid() },
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
    this.pollTimer = setInterval(() => {
      wx.cloud.callFunction({
        name: 'versus-service',
        data: { action: 'poll', roomId: this.data.roomId, openid: this.getOpenid() },
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
    const q = bank.levels[2].questions[0]; // 对攻题库固定入口
    this.setData({ question: q });
  },

  onCardTap(e) {
    if (this.data.myAnswered) return;
    this.setData({ myBreakpoint: e.currentTarget.dataset.id });
  },

  onSubmit() {
    const { question, myBreakpoint } = this.data;
    if (!myBreakpoint) return;

    wx.cloud.callFunction({
      name: 'versus-service',
      data: {
        action: 'answer',
        roomId: this.data.roomId,
        openid: this.getOpenid(),
        questionId: question.id,
        breakpoint: {
          from: myBreakpoint,
          to: question.cards.find(c => c.type === 'conclusion').id,
          fallacy: question.fallacyKey,
        },
      },
    }).then(() => {
      this.setData({ myAnswered: true });
      this.checkMerged();
    });
  },

  /** 双方答案合并后才能交卷 —— 强制协作 */
  checkMerged() {
    if (!this.data.myAnswered) return;
    wx.cloud.callFunction({
      name: 'versus-service',
      data: { action: 'check', roomId: this.data.roomId, openid: this.getOpenid() },
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
    const { question, myBreakpoint, opponentBreakpoint } = this.data;
    const bp = question.breakpoint;
    const conclusionId = question.cards.find(c => c.type === 'conclusion').id;

    const iAmRight = myBreakpoint === bp.from;
    const oppRight = opponentBreakpoint === bp.from;
    const iFoundIt = iAmRight;

    this.setData({
      status: 'finished',
      result: {
        iFoundIt,
        oppFoundIt: oppRight,
        iAmRight,
        oppRight,
        rightFrom: bp.from,
        rightFallacy: bp.fallacy,
        truth: question.groundTruth,
        // 失败方也得到正向反馈：抓到了 = 有效识别
        verdict: iFoundIt
          ? (oppRight ? '你们都抓到了。' : '你抓到了，对手没看到。')
          : (oppRight ? '对手抓到了，你没有。' : '你们都没抓到——这题的断点比较隐蔽。'),
      },
    });

    // 无论胜负都写入日志，计入刻度
    app.addLog({
      ts: Date.now(),
      levelId: 3,
      fallacyKey: question.fallacyKey,
      correct: iAmRight,
      fellInto: !iAmRight,
      mode: 'versus',
      durationMs: 0,
    });
  },

  onAgain() {
    this.setData({
      status: 'idle', question: null, myBreakpoint: null,
      opponentBreakpoint: null, myAnswered: false,
      opponentAnswered: false, result: null, mergedComplete: false,
      roomId: '',
    });
  },

  getOpenid() {
    return app.globalData.openid || '';
  },
});