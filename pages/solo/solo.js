/** 单闯页· 五关叙事拆招（零门槛主入口） */

const app = getApp();
const { FALLACIES, evaluate, buildFeedback } = require('../../utils/argue-engine.js');
const bank = require('../../data/levels.js');
const compliance = require('../../utils/compliance.js');

Page({
  data: {
    levels: bank.levels.map(lv => ({
      id: lv.id, name: lv.name, scene: lv.scene,
      difficulty: lv.difficulty, unlocked: lv.id === 1,
    })),
    currentLevelId: 1,
    currentQuestionIndex: 0,
    question: null,
    cards: [],
    selectedFrom: null,
    selectedFallacy: null,
    fallacyOptions: [],
    submitted: false,
    result: null,
    feedback: null,
    progressText: '',
    answeredCount: 0,
  },

  onLoad() {
    this.sessionAnswers = [];
    this.startedAt = Date.now();
    this.setData({
      fallacyOptions: Object.values(FALLACIES)
        .filter(f => f.group === '形式' || f.group === '论证' || f.group === '语义')
        .slice(0, 12)
        .map(f => ({ key: f.key, name: f.name, group: f.group })),
    });
    this.loadLevel(1);
  },

  /** 加载关卡 */
  loadLevel(levelId) {
    const lv = bank.levels.find(l => l.id === levelId);
    if (!lv) return;
    this.currentLevel = lv;
    this.setData({
      currentLevelId: levelId,
      currentQuestionIndex: 0,
      progressText: `第 ${levelId} 关 · ${lv.name}`,
    });
    this.loadQuestion();
  },

  loadQuestion() {
    const q = this.currentLevel.questions[this.data.currentQuestionIndex];
    this.setData({
      question: q,
      cards: q.cards,
      selectedFrom: null,
      selectedFallacy: null,
      submitted: false,
      result: null,
      feedback: null,
    });
  },

  /** 选择断点起点（点第一张卡） */
  onCardTap(e) {
    if (this.data.submitted) return;
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedFrom: this.data.selectedFrom === id ? null : id });
  },

  /** 选择谬误类型 */
  onFallacyTap(e) {
    if (this.data.submitted) return;
    this.setData({ selectedFallacy: e.currentTarget.dataset.key });
  },

  /** 提交作答 */
  onSubmit() {
    const { selectedFrom, selectedFallacy, question } = this.data;
    if (!selectedFrom || !selectedFallacy) return;

    const answer = {
      breakpointFrom: selectedFrom,
      breakpointTo: question.cards.find(c => c.type === 'conclusion').id,
      fallacyKey: selectedFallacy,
    };

    const result = evaluate(question, answer);
    const feedback = buildFeedback(
      question,
      result,
      { missCount: this.sessionAnswers.filter(a => !a.correct).length }
    );

    this.sessionAnswers.push({
      levelId: this.data.currentLevelId,
      fallacyKey: question.fallacyKey,
      correct: result.correct,
      durationMs: Date.now() - this.startedAt,
    });

    // 反馈文案必须过合规检查
    const safeFeedback = {
      ...feedback,
      text: compliance.sanitize(feedback.text),
    };

    this.setData({ submitted: true, result, feedback: safeFeedback });
  },

  /** 下一题 / 下一关 */
  onNext() {
    const { currentQuestionIndex } = this.data;
    const total = this.currentLevel.questions.length;

    if (currentQuestionIndex + 1 < total) {
      this.setData({
        currentQuestionIndex: currentQuestionIndex + 1,
        answeredCount: this.data.answeredCount + 1,
      });
      this.loadQuestion();
      return;
    }

    // 本关完成
    const nextLevelId = this.data.currentLevelId + 1;
    const hasNext = nextLevelId <= bank.levels.length;

    if (hasNext) {
      wx.showToast({ title: `第 ${this.data.currentLevelId} 关完成`, icon: 'none' });
      this.loadLevel(nextLevelId);
    } else {
      // 全部完成，写入日志并跳转指纹页
      const count = app.finishSession();
      wx.redirectTo({ url: `/pages/fingerprint/fingerprint?total=${count}` });
    }
  },

  /** 退出确认 */
  onExit() {
    wx.showModal({
      title: '退出本轮',
      content: '当前进度不会保存，退出后本次作答不计入你的记录。',
      confirmText: '退出',
      cancelText: '继续',
      success: (res) => {
        if (res.confirm) wx.switchTab({ url: '/pages/profile/profile' });
      },
    });
  },
});