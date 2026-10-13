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
const argFw = require('../../utils/arg-framework.js');
const troll = require('../../utils/troll-screen.js');
const soloBank = require('../../data/levels.js');
const rotationBank = require('../../data/rotation-bank.js');
const versusBank = require('../../data/versus-bank.js');
const extendedBank = require('../../data/extended-bank.js');

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
    selectedFallacy: null,
    fallacyOptions: Object.values(FALLACIES).map(f => ({
      key: f.key, name: f.name, group: f.group,
    })),

    // ===== v2.1 新增：训练层专属模块 =====
    // ARG 只在训练层与月测出现，首测禁用（见 arg-framework.argEnabledFor）
    trainingMode: 'daily',        // daily | arg | troll
    argEnabled: argFw.argEnabledFor('train'),

    // ARG 模块
    argItem: null,
    argOptions: argFw.ARG_LIST.map(s => ({
      key: s.key, name: s.name, question: s.question,
    })),
    argPick: null,
    argResult: null,

    // 杠精模块
    trollItem: null,
    trollPick: null,
    trollOptions: [],
    trollResult: null,
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

  /**
   * 今日三题：从 65 题池中按需抽取
   *
   * 策略（依据 Sailer & Homner 2020：交错练习有效）：
   *   1. 优先补最弱分组（分组聚合是主榜统计口径）
   *   2. 其余题随机，避免连续同类型导致疲劳
   *   3. 轮换题库优先——它就是为「每日不重复」设计的
   */
  loadDailyQuestions() {
    const today = new Date().toDateString();
    const logs = app.globalData.logs;
    const answeredIds = new Set(logs.map(l => l.qid).filter(Boolean));

    // 组装全部 65 题为统一结构
    const pool = [];
    for (const lv of soloBank.levels) {
      for (const q of lv.questions) {
        pool.push({ ...q, levelId: lv.id, difficulty: lv.difficulty, scene: lv.scene, bank: 'solo' });
      }
    }
    for (const q of versusBank.questions) pool.push({ ...q, levelId: 0, bank: 'versus' });
    for (const q of rotationBank.questions) pool.push({ ...q, levelId: 0, bank: 'rotation' });
    // v2.1：纳入新维度题库（以偏概全/转移话题/背景绝对化）
    for (const q of extendedBank.questions) pool.push({ ...q, levelId: 0, bank: 'extended' });

    // 优先未做过的题；全做过则退回全池
    let candidates = pool.filter(q => !answeredIds.has(q.id));
    if (candidates.length < 3) candidates = pool;

    // 找出最弱的分组
    const fp = computeFingerprint(logs);
    const weakGroups = fp.groups.slice(0, 2).map(g => g.key);

    const picked = [];
    const used = new Set();

    // 1. 先从最弱分组里选一题
    for (const g of weakGroups) {
      const hit = candidates.find(q =>
        !used.has(q.id) &&
        FALLACIES[q.fallacyKey] && FALLACIES[q.fallacyKey].group === g &&
        q.bank === 'rotation'
      );
      if (hit) {
        picked.push(hit);
        used.add(hit.id);
        break;
      }
    }
    // 弱组没有轮换题时，退而从该组全部题里选
    if (picked.length === 0 && weakGroups.length) {
      const hit = candidates.find(q =>
        !used.has(q.id) &&
        FALLACIES[q.fallacyKey] && FALLACIES[q.fallacyKey].group === weakGroups[0]
      );
      if (hit) { picked.push(hit); used.add(hit.id); }
    }

    // 2. 补足剩余，按组间隔避免同类型扎堆
    const weakKeys = fp.fall.slice(0, 3).map(x => x.key);
    const rest = candidates
      .filter(q => !used.has(q.id))
      .sort((a, b) => {
        // 单维薄弱项优先
        const aWeak = weakKeys.includes(a.fallacyKey) ? 1 : 0;
        const bWeak = weakKeys.includes(b.fallacyKey) ? 1 : 0;
        if (aWeak !== bWeak) return bWeak - aWeak;
        // 轮换题优先（为每日新鲜感设计）
        if (a.bank !== b.bank) return a.bank === 'rotation' ? -1 : 1;
        return Math.random() - 0.5;
      });

    for (const q of rest) {
      if (picked.length >= 3) break;
      // 避免与已选题同组，保证三类都有覆盖
      const lastGroup = picked.length
        ? FALLACIES[picked[picked.length - 1].fallacyKey].group : null;
      if (lastGroup && FALLACIES[q.fallacyKey].group === lastGroup) continue;
      picked.push(q);
      used.add(q.id);
    }

    // 不足 3 题时放宽组限制
    for (const q of rest) {
      if (picked.length >= 3) break;
      if (used.has(q.id)) continue;
      picked.push(q);
      used.add(q.id);
    }

    this.dailySet = picked.slice(0, 3);
    this.setData({
      todayQuestions: this.dailySet,
      currentIndex: 0,
    });
  },

  onStartMode() {
    this.loadStats();
    this.loadDailyQuestions();
    this.setData({ trainingMode: 'daily', argItem: null, trollItem: null });
  },

  onStart() {
    this.setData({
      trainingMode: 'daily',
      started: true,
      currentQuestion: this.dailySet[0],
      currentIndex: 0,
    });
  },

  onCardTap(e) {
    if (this.data.submitted) return;
    this.setData({ selectedFrom: e.currentTarget.dataset.id });
  },

  /** 选择谬误类型 —— 必须由用户作答 */
  onFallacyTap(e) {
    if (this.data.submitted) return;
    this.setData({ selectedFallacy: e.currentTarget.dataset.key });
  },

  onSubmit() {
    const { currentQuestion: q, selectedFrom, selectedFallacy } = this.data;
    if (!selectedFrom || !selectedFallacy) return;

    const answer = {
      breakpointFrom: selectedFrom,
      breakpointTo: q.cards.find(c => c.type === 'conclusion').id,
      fallacyKey: selectedFallacy,
    };

    const { evaluate, buildFeedback } = require('../../utils/argue-engine.js');
    const result = evaluate(q, answer);
    const feedback = buildFeedback(q, result, { missCount: 0 });

    app.addLog({
      ts: Date.now(),
      qid: q.id,
      levelId: q.levelId,
      fallacyKey: q.fallacyKey,
      correct: result.correct,
      fellInto: !result.correct,
      mode: 'train',
      durationMs: 0,
    });

    this.setData({ submitted: true, result, feedback });
  },

  // ================= v2.1 新增：ARG 训练 =================

  onSwitchArg() {
    const item = extendedBank.argTraining[
      Math.floor(Math.random() * extendedBank.argTraining.length)
    ];
    this.setData({
      trainingMode: 'arg',
      argItem: item,
      argPick: null,
      argResult: null,
      started: false,
    });
  },

  onArgPick(e) {
    if (this.data.argResult) return;
    this.setData({ argPick: e.currentTarget.dataset.key });
  },

  onArgSubmit() {
    const { argItem, argPick } = this.data;
    if (!argPick || !argItem) return;

    // 先按题目给出的线索构造判定输入，再让框架算
    const evaluation = argFw.evaluateARG({
      // ARG 的三关线索直接取自题目标注
      opinions: argPick === 'A' ? [argItem.premise] : [],
      facts: argPick === 'A' ? [] : [argItem.premise],
      premiseCount: 1,
      linksToConclusion: argPick !== 'R',
      staysOnTopic: argPick !== 'R',
      usesProbabilityAsCertain: argPick === 'G',
      hasCounterExample: argPick !== 'G',
      hiddenPremises: argItem.hiddenPremise ? 1 : 0,
    });

    const feedback = argFw.buildARGTrainingFeedback(evaluation);
    const correct = argPick === argItem.arg;

    // 计入日志：按 ARG 维度，不按 15 维
    app.addLog({
      ts: Date.now(),
      qid: argItem.id,
      levelId: 0,
      argDimension: argItem.arg,
      argPicked: argPick,
      argCorrect: correct,
      fallacyKey: null,
      correct: correct,
      fellInto: !correct,
      mode: 'train_arg',
      durationMs: 0,
    });

    this.setData({
      argResult: {
        correct,
        expected: argItem.arg,
        expectedName: argFw.ARG_STANDARDS[argItem.arg].name,
        feedback,
        hiddenPremise: argItem.hiddenPremise,
      },
    });
  },

  /** ARG 训练自检模式 —— 课程明确说四问也用于自检 */
  onArgSelfCheck() {
    const r = troll.selfCheck({
      hasReason: this.data.argPick !== null,
      reasonVerifiable: this.data.argPick === 'A',
      reasonRelevant: this.data.argPick !== 'R',
      reasoningOneSided: this.data.argPick !== 'G',
    });
    wx.showModal({
      title: '自检',
      content: r.text,
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // ================= v2.1 新增：杠精应对 =================

  onSwitchTroll() {
    const item = extendedBank.trollTraining[
      Math.floor(Math.random() * extendedBank.trollTraining.length)
    ];
    this.setData({
      trainingMode: 'troll',
      trollItem: item,
      trollPick: null,
      trollResult: null,
      started: false,
      // 策略选项按题目所在的关卡动态生成
      trollOptions: this.buildTrollOptions(item),
    });
  },

  /** 根据失守关卡生成可选策略 */
  buildTrollOptions(item) {
    const check = troll.CHECKS.find(c => c.key === item.stopAt);
    if (!check) return [];
    // 第3关有双分支，按题目指定的分支取策略集
    if (check.branches) {
      const branch = check.branches.find(b => b.key === item.branch)
        || check.branches[0];
      return branch.strategies.map(s => ({
        key: s.key, name: s.name, desc: s.desc,
      }));
    }
    return (check.strategies || []).map(s => ({
      key: s.key, name: s.name, desc: s.desc,
    }));
  },

  onTrollPick(e) {
    if (this.data.trollResult) return;
    this.setData({ trollPick: e.currentTarget.dataset.key });
  },

  onTrollSubmit() {
    const { trollItem, trollPick } = this.data;
    if (!trollPick || !trollItem) return;

    // 用筛查框架反推：用户在第几关停下
    const screenResult = troll.screen({
      hasReason: trollItem.stopAt !== 1,
      reasonVerifiable: trollItem.stopAt !== 2,
      reasonRelevant: trollItem.stopAt !== 3,
      branch3: trollItem.branch,
      reasoningOneSided: trollItem.stopAt !== 4,
    });

    const response = troll.buildResponse(screenResult);
    const correct = trollPick === trollItem.bestStrategy;

    app.addLog({
      ts: Date.now(),
      qid: trollItem.id,
      levelId: 0,
      trollStopAt: trollItem.stopAt,
      trollBranch: trollItem.branch,
      trollPicked: trollPick,
      trollCorrect: correct,
      argDimension: troll.CHECK_TO_ARG[trollItem.stopAt],
      fallacyKey: null,
      correct: correct,
      fellInto: !correct,
      mode: 'train_troll',
      durationMs: 0,
    });

    this.setData({
      trollResult: {
        correct,
        expected: trollItem.bestStrategy,
        stopAt: trollItem.stopAt,
        stopName: trollItem.expectedName,
        branch: trollItem.branch,
        response,
        why: trollItem.why,
      },
    });
  },

  onNext() {
    const next = this.data.currentIndex + 1;
    if (next < this.dailySet.length) {
      this.setData({
        currentIndex: next,
        currentQuestion: this.dailySet[next],
        selectedFrom: null,
        selectedFallacy: null,
        submitted: false,
        result: null,
        feedback: null,
      });
    } else {
      this.setData({ started: false });
      this.loadStats();
    }
  },
});