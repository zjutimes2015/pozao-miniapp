const app = getApp();
const {
  FEEDBACK_TYPES,
  LIMITS,
  validateFeedback,
  submitFeedbackToCloud,
} = require('../../utils/feedback.js');

Page({
  data: {
    types: FEEDBACK_TYPES,
    feedbackType: '',
    content: '',
    contact: '',
    contentCount: 0,
    contentLimit: LIMITS.content,
    errors: {},
    submitting: false,
    done: false,

    // 上下文信息（提交时一并带上，便于后台定位问题来源）
    pagePath: '',
    sessionId: '',
    typeCode: '',
    source: '',
  },

  onLoad(query) {
    // 来源页：结果页 / 我的页 / 其他
    const from = String(query.from || '');
    const source = ['fingerprint', 'profile', 'solo', 'train', 'versus'].includes(from)
      ? from
      : 'profile';

    // sessionId：优先取当前会话，其次取最近一条日志的时间戳作为会话标识
    const session = app.globalData.session;
    const logs = app.globalData.logs || [];
    const sessionId = (session && session.startedAt)
      ? String(session.startedAt)
      : (logs.length ? String(logs[logs.length - 1].ts) : '');

    this.setData({
      pagePath: query.pagePath || '',
      sessionId,
      typeCode: String(query.typeCode || ''),
      source,
    });
  },

  /** 选择反馈类型 */
  onTypeTap(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    // 清掉该字段的错误提示，但不重置其他已填内容
    const errors = Object.assign({}, this.data.errors);
    delete errors.feedbackType;
    this.setData({ feedbackType: key, errors });
  },

  /** 输入反馈内容 */
  onContentInput(e) {
    const content = e.detail.value;
    const errors = Object.assign({}, this.data.errors);
    if (content.trim()) delete errors.content;
    this.setData({
      content,
      contentCount: content.length,
      errors,
    });
  },

  /** 输入联系方式 */
  onContactInput(e) {
    const contact = e.detail.value;
    const errors = Object.assign({}, this.data.errors);
    if (contact.length <= LIMITS.contact) delete errors.contact;
    this.setData({ contact, errors });
  },

  onSubmit() {
    if (this.data.submitting) return;

    // 先做本地校验 —— 让用户立刻看到问题，而不是等一次网络往返
    const checked = validateFeedback({
      feedbackType: this.data.feedbackType,
      content: this.data.content,
      contact: this.data.contact,
      pagePath: this.data.pagePath,
      sessionId: this.data.sessionId,
      typeCode: this.data.typeCode,
      source: this.data.source,
      createdAtMs: Date.now(),
    });

    if (!checked.ok) {
      this.setData({ errors: checked.errors });
      return;
    }

    this.setData({ submitting: true, errors: {} });

    submitFeedbackToCloud(checked.data).then((res) => {
      this.setData({ submitting: false });

      if (res.ok) {
        this.setData({ done: true });
        wx.showToast({ title: '已收到', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/profile/profile' }) });
        }, 1200);
        return;
      }

      // QUEUED 表示网络不可用但已本地留存 —— 不是失败
      if (res.code === 'QUEUED') {
        this.setData({ done: true });
        wx.showToast({ title: '已记录', icon: 'none' });
        setTimeout(() => {
          wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/profile/profile' }) });
        }, 1200);
        return;
      }

      wx.showToast({ title: res.message || '提交失败', icon: 'none', duration: 2500 });
    });
  },

  /** 放弃填写 */
  onCancel() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/profile/profile' }),
    });
  },
});