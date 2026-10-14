/** 我的页 — 隐私与数据管理
 *
 * 合规要点：
 *   - 提供数据删除入口（HN曾专门吐槽竞品无法删账号）
 *   - 不收集手机号、不要求注册
 *   - 隐私说明完整可见
 */

const app = getApp();
const compliance = require('../../utils/compliance.js');
const { flushPendingFeedback, PENDING_KEY } = require('../../utils/feedback.js');

Page({
  data: {
    totalAnswers: 0,
    totalLogs: 0,
    disclaimer: '',
    reviewNote: '',
    showReviewNote: false,
    pendingFeedback: 0,
  },

  onShow() {
    this.setData({
      totalAnswers: app.globalData.logs.length,
      totalLogs: app.globalData.logs.length,
      disclaimer: compliance.DISCLAIMER,
      reviewNote: compliance.REVIEW_NOTE,
      pendingFeedback: this.countPending(),
    });

    // 补传离线期间的反馈 —— 放在「我的」页而非启动时，
    // 因为这是用户唯一会主动打开的非答题页，
    // 且此时网络与云环境必然已就绪。
    flushPendingFeedback().then((r) => {
      if (r.sent > 0) {
        this.setData({ pendingFeedback: this.countPending() });
      }
    });
  },

  /** 统计待传反馈数（用于展示"有 N 条反馈待提交"） */
  countPending() {
    try {
      const list = wx.getStorageSync(PENDING_KEY) || [];
      return Array.isArray(list) ? list.length : 0;
    } catch (e) {
      return 0;
    }
  },

  onShowReviewNote() {
    this.setData({ showReviewNote: true });
  },

  /** 清空全部数据 */
  onClearData() {
    wx.showModal({
      title: '清空全部数据',
      content: '你的所有答题记录、指纹都会被删除，无法恢复。确定吗？',
      confirmText: '删除',
      confirmColor: '#A32D2D',
      success: (res) => {
        if (res.confirm) {
          app.clearAll();
          // 待传反馈也要清 —— 否则已删除的用户状态仍会被补传，
          // 且用户以为「全清」了，实际还有数据留着。
          try {
            wx.removeStorageSync(PENDING_KEY);
          } catch (e) { /* ignore */ }
          this.setData({ totalAnswers: 0, totalLogs: 0, pendingFeedback: 0 });
          wx.showToast({ title: '已清空', icon: 'none' });
        }
      },
    });
  },

  /** 反馈入口 */
  onFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback?from=profile',
    });
  },

  onAbout() {
    wx.showModal({
      title: '关于',
      content: '这是一个逻辑推理能力测评工具。\n\n每道题都有唯一正确答案，结果只反映你当前的答题表现。\n\n不收集出生日期、姓名、手机号，不预测任何未来表现。',
      showCancel: false,
      confirmText: '知道了',
    });
  },
});