/** 训练页 — 承接裂变层留下的人
 *
 * 机制依据：
 *   - 每日门槛 3 题（Brilliant Streak 门槛对齐，低门槛优先于长时长）
 *   - 断签可修复，不清零（Lally et al. 2010:漏一天不实质影响习惯形成）
 *   - 不做进度条（Yu, Yu & Li 2024：唯一被点名为无效的元素）
 *   - 奖励用言语反馈，不用积分（Deci et al. 1999:确定性物质奖励挤出动机）
 */

const app = getApp();
const { FALLACIES, computeFingerprint, describePattern } = require('../../utils/argue-engine.js');
const bank = require('../../data/levels.js');

Page({
  data: {
    todayDone: 0,
    todayTarget: 3,
    streak: 0,
    streakProtected: true,   // 断签可修复
    totalAnswers: 0,
    weakList: [],
    strongList: [],
    pattern: '',
    todayQuestions: [],
    currentIndex: 0,
    currentQuestion: null,
    selectedFrom: null,
    submitted: false,
    result: null,
    started: false,
  },

  onShow() {
    this.loadStats();
    this.loadDailyQuestions();
  },

  loadStats() {
    const logs = app.globalData.logs;
    const today = new Date().toDateString();

    const todayLogs = logs.filter(l => new Date(l.ts).toDateString() === today);

    // 连续天数 + 断签保护：漏一天不算清零
    const streakInfo = this.computeStreak(logs);

    // 取历史薄弱项 Top3 作为今日训练重点
    const fp = computeFingerprint(logs);
    const weakKeys = fp.fall.slice(0, 3).map(x => x.key);

    this.setData({
      todayDone: todayLogs.length,
      totalAnswers: logs.length,
      streak: streakInfo.days,
      streakProtected: streakInfo.recoverable,
      weakList: fp.fall.map(x => ({ name: x.name, rate: x.rate })),
      strongList: fp.catch.map(x => ({ name: x.name, rate: x.rate })),
      pattern: describePattern(fp),
      weakKeys,
    });
  },

  /**
   * 计算连续天数
   * 关键：允许「漏一天」，只要之后恢复就算继续，不清零
   */
  computeStreak(logs) {
    if (!logs.length) return { days: 0, recoverable: true };

    const days = new Set(logs.map(l => new Date(l.ts).toDateString()));
    const sorted = [...days].sort().reverse();

    let streak = 1;
    let gaps = 0;

    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diffDays = Math.round((prev - curr) / 86400000);
      if (diffDays === 1) {
        streak++;
        if (gaps === 0) continue;
      } else if (diffDays === 2 && gaps === 0) {
        // 漏一天：可恢复，streak 继续
        streak++;
        gaps++;
      } else {
        break;
      }
    }

    // 今天还没练不算断
    const today = new Date().toDateString();
    const hasToday = days.has(today);
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    let recoverable = true;
    if (!hasToday && !days.has(yesterday)) {
      // 昨天也没练 —— 但今天来练就能恢复
      recoverable = true;
    }

    return { days: hasToday ? streak : streak, recoverable };
  },

  /** 今日三题：优先薄弱项 */
  loadDailyQuestions() {
    const all = [];
    for (const lv of bank.levels) {
      for (const q of lv.questions) all.push({ ...q, levelId: lv.id });
    }

    const weakKeys = this.data.weakKeys || [];
    const priority = all.filter(q => weakKeys.includes(q.fallacyKey));
    const rest = all.filter(q => !weakKeys.includes(q.fallacyKey));

    const picks = [
      ...priority.slice(0, 2),
      ...rest.slice(0, 1),
    ];

    this.dailySet = picks.length >= 3 ? picks : all.slice(0, 3);
    this.setData({ todayQuestions: this.dailySet, currentIndex: 0 });
  },

  onStart() {
    this.setData({ started: true, currentQuestion: this.dailySet[0], currentIndex: 0 });
  },

  onCardTap(e) {
    if (this.data.submitted) return;
    this.setData({ selectedFrom: e.currentTarget.dataset.id });
  },

  onSubmit() {
    const { currentQuestion: q, selectedFrom } = this.data;
    if (!selectedFrom) return;

    const answer = {
      breakpointFrom: selectedFrom,
      breakpointTo: q.cards.find(c => c.type === 'conclusion').id,
      fallacyKey: q.fallacyKey,
    };

    const { evaluate, buildFeedback } = require('../../utils/argue-engine.js');
    const result = evaluate(q, answer);
    const feedback = buildFeedback(q, result, { missCount: 0 });

    app.addLog({
      ts: Date.now(),
      levelId: q.levelId,
      fallacyKey: q.fallacyKey,
      correct: result.correct,
      fellInto: !result.correct,
      mode: 'train',
      durationMs: 0,
    });

    this.setData({ submitted: true, result, feedback });
  },

  onNext() {
    const next = this.data.currentIndex + 1;
    if (next < this.dailySet.length) {
      this.setData({
        currentIndex: next,
        currentQuestion: this.dailySet[next],
        selectedFrom: null,
        submitted: false,
        result: null,
      });
    } else {
      this.setData({ started: false });
      this.loadStats();
    }
  },
});