# 《破招》功能逻辑地图

> 用途：与 AI 协作的共同外置记忆。
> 回答四个问题：**改什么？影响哪里？不能动什么？怎么验证？**
>
> 生成时间：2026-10-14 · 对应代码规模 5850 行 / 24 个源文件
> 维护规则：**改动代码时同步更新本地图**，否则地图即失效。

---

## 0. 9 类节点定义

| 前缀 | 含义 | 本项目示例 |
|---|---|---|
| CAP | 产品能力 | CAP-001 论证拆招测评 |
| PAGE | 页面 | PAGE-001 单闯页 |
| UI | 按钮、输入框、组件 | UI-001 开始测评按钮 |
| ACT | 用户动作 | ACT-001 选择断点起点 |
| FLOW | 业务流程 | FLOW-001 首测答题流程 |
| API | 接口 / 云函数 | API-001 生成匿名标识 |
| STORE | 数据存储 | STORE-001 答题日志 |
| RULE | 规则 / 算法 | RULE-001 形式类真值表判定 |
| TEST | 测试 / 校验 | TEST-001 引擎正确性 |

**编号规则**：同类节点 ID 从001 递增。一旦分配**永不复用**，即使节点删除也保留编号空缺——
避免历史文档与代码对不上号。

---

## 1. 核心能力层

### CAP-001 · 论证拆招测评
- **位置**：`pages/solo/` + `utils/argue-engine.js`
- **职责**：给用户一段话，让其指出推理断点并判断谬误类型。**零门槛主入口，3-4 分钟走完五关。**
- **上游**：`PAGE-001` 进入
- **下游**：`FLOW-001` 答题 → `STORE-001` 记录 → 产出 `CAP-002`

### CAP-002 · 论证指纹
- **位置**：`pages/fingerprint/` + `utils/argue-engine.js` 的 `computeFingerprint`
- **职责**：把答题记录聚合成能力结构（向上/向外/向内三组），生成分组表现与叙述性结论。
- **上游**：`STORE-001`
- **下游**：`PAGE-003` 展示 → `CAP-005` 分享卡片

### CAP-003 · 同题对攻
- **位置**：`pages/versus/versus.js` + `cloudfunctions/versus-service/index.js`
- **职责**：两人拆同一段话，**合并答案后才能交卷**，强制协作而非纯竞争。
- **上游**：`API-003` 创建房间
- **下游**：`STORE-004` 对攻记录

### CAP-004 · 训练层
- **位置**：`pages/train/train.js` 的 `loadDailyQuestions` / `onSwitchArg` / `onSwitchTroll`
- **职责**：每日三题（从 77 题池按薄弱项抽取）+ **ARG 论证质量** + **杠精应对**两个新模块。
- **上游**：`STORE-001`
- **下游**：`STORE-002`（每日训练记录）

### CAP-005 · 分享卡片
- **位置**：`pages/fingerprint/fingerprint.js` 的 `drawCard`
- **职责**：canvas 本地绘制可分享卡片，**不依赖云函数**，离线可用。
- **上游**：`CAP-002`
- **下游**：微信转发

### CAP-006 · ARG 论证质量评估
- **位置**：`utils/arg-framework.js`
- **职责**：A 可接受性 / R 相关性 / G 充分性三关判定。**仅训练层与月测可用。**
- **上游**：`PAGE-004` 训练层调用
- **下游**：`STORE-002`

### CAP-007 · 杠精应对训练
- **位置**：`utils/troll-screen.js`
- **职责**：四关线性筛查 + 分场景应对话术。**教学价值从「知识」升到「知识+行动」。**
- **上游**：`PAGE-004`
- **下游**：`STORE-002`

### CAP-008 · 欧拉图推理（设计中）
- **位置**：`utils/euler-diagram.js`
- **职责**：用同心圆可视化形式组三类谬误。**断点 = 图上反例位置（蓝点）**。
- **状态**：引擎已建（约 273 行），**页面未接入**
- **下游**：计划接入 `PAGE-001`

---

## 2. 单闯主流程（首测）

### PAGE-001 · 单闯页
- **位置**：`pages/solo/solo.js` · `solo.wxml` · `solo.wxss`
- **职责**：五关叙事拆招的主承载页。TabBar 首页。
- **上游**：`STORE-003` 关卡解锁进度
- **下游**：`ACT-001` → `ACT-002` → `ACT-003` → `FLOW-002`

### UI-001 · 关卡选择条
- **位置**：`pages/solo/solo.wxml` 的 `.levels`
- **职责**：横向滚动展示五关，`chip-locked` 表示未解锁。
- **上游**：`STORE-003` 关卡解锁进度
- **下游**：`PAGE-001` 渲染展示

### UI-002 · 方向标签与提示语
- **位置**：`pages/solo/solo.wxml` 的 `.scene-head`
- **职责**：展示「向外/ 向上 / 向内」方向锚点，降低记忆 12 个词的成本。
- **上游**：`data/levels.js` 的 `direction` 字段
- **下游**：`PAGE-001` 渲染展示

### UI-003 · 卡片选择区
- **位置**：`pages/solo/solo.wxml` 的 `.cards`
- **职责**：前提卡与结论卡。点击选为断点起点。
- **上游**：`data/levels.js` 的 `cards` 字段
- **下游**：`ACT-001` 接收点击

### UI-004 · 谬误类型选择器
- **位置**：`pages/solo/solo.wxml` 的 `.options`
- **职责**：15 类谬误的 chip 选择。
- **上游**：`RULE-004` 提供选项列表
- **下游**：`ACT-002` 接收选择

### UI-005 · 结果反馈区
- **位置**：`pages/solo/solo.wxml` 的 `.feedback`
- **职责**：展示抓取结果、正确答案、提示语。
- **上游**：`RULE-002` 生成反馈文案
- **下游**：`ACT-004` 触发下一题

### ACT-001 · 选择断点起点
- **位置**：`pages/solo/solo.js` 的 `onCardTap`
- **职责**：记录用户认为推理在哪断开。
- **上游**：`UI-003` 卡片点击
- **下游**：`ACT-003` 提交时读取

### ACT-002 · 选择谬误类型
- **位置**：`pages/solo/solo.js` 的 `onFallacyTap`
- **职责**：记录用户判断的谬误种类。
- **上游**：`UI-004` chip 点击
- **下游**：`ACT-003` 提交时读取
- ⚠️ **必须由用户作答**，不可用 `question.fallacyKey` 代替（见 `RULE-006`）

### ACT-003 · 提交作答
- **位置**：`pages/solo/solo.js` 的 `onSubmit`
- **职责**：合并断点与谬误类型，交给引擎判定。
- **上游**：`ACT-001` + `ACT-002`
- **下游**：`RULE-002` 判定 → `STORE-001` 写入

### ACT-004 · 微信转发
- **位置**：`pages/solo/solo.js` 的 `onShareAppMessage` + `solo.wxml` 的 `button open-type="share"`
- **职责**：合规分享入口。**不设奖励、不解锁内容。**
- **上游**：`PAGE-001` 用户点击分享
- **下游**：`C-004` 合规约束下的微信转发面板

### FLOW-001 · 首测答题流程
- **位置**：`pages/solo/solo.js` 的 `onLoad` → `onNext`
- **职责**：五关 × 3 题 = 15 题，首关 ≤ 90 秒，全流程 ≤ 4 分钟。
- **上游**：`PAGE-001` 加载
- **下游**：`CAP-002` 产出指纹
- **约束**：受 `RULE-008` 首测不得出现 ARG 约束

### FLOW-002 · 关卡推进流程
- **位置**：`pages/solo/solo.js` 的 `markLevelPassed`
- **职责**：每关完成写入 `pz_solo_passed`，解锁下一关。
- **上游**：`ACT-003` 累计
- **下游**：`STORE-003` → `UI-001` 解锁态

---

## 3. 论证指纹模块

### PAGE-003 · 论证指纹页
- **位置**：`pages/fingerprint/fingerprint.js`
- **职责**：展示表现结构、易犯破绽、会抓漏洞、场合敏感度、模式描述。
- **上游**：`STORE-001`
- **下游**：`CAP-005` 卡片

### UI-006 · 分组表现卡
- **位置**：`pages/fingerprint/fingerprint.wxml` 的 `.group-item`
- **职责**：三组（向上/向外/向内）的易犯率与能抓率双条形。
- **上游**：`RULE-005` 聚合结果
- **下游**：`PAGE-003`

### UI-007 · 离屏canvas
- **位置**：`pages/fingerprint/fingerprint.wxml` 的 `canvas#pzCard`
- **职责**：卡片绘制画布，脱离可视区避免闪烁。
- **上游**：`ACT-005`
- **下游**：canvas → 临时文件

### UI-008 · 场合敏感度列表
- **位置**：`pages/fingerprint/fingerprint.wxml` 的 `.scene-item`
- **职责**：展示「你最容易失守的场合」。**Brilliant 与 MBTI 均无此维度。**
- **上游**：`RULE-005`
- **下游**：`PAGE-003`

### ACT-005 · 生成卡片
- **位置**：`pages/fingerprint/fingerprint.js` 的 `onGenerateCard` → `drawCard`
- **职责**：canvas 本地绘制 → `canvasToTempFilePath` → 预览保存。
- **上游**：`CAP-002`
- **下游**：`UI-007` → 微信相册

### FLOW-003 · 指纹生成流程
- **位置**：`utils/argue-engine.js` 的 `computeFingerprint` + `describePattern`
- **职责**：日志 → 按维度聚合 → 贝叶斯平滑 → 分组排序 → 叙述性结论。
- **上游**：`STORE-001`
- **下游**：`RULE-005` → `PAGE-003`

---

## 4. 对攻模块

### PAGE-002 · 对攻页
- **位置**：`pages/versus/versus.js`
- **职责**：创建房间 → 邀请 → 双方作答 → 合并结算。
- **上游**：`API-003`
- **下游**：`STORE-004`

### UI-009 · 合并状态指示
- **位置**：`pages/versus/versus.wxml` 的 `.merge-status`
- **职责**：显示双方是否已提交。
- **上游**：`API-004` 轮询
- **下游**：`PAGE-002`

### UI-010 · 结算结果卡
- **位置**：`pages/versus/versus.wxml` 的 `.result-block`
- **职责**：显示双方是否抓到。
- **上游**：`RULE-003` 双重判定
- **下游**：`UI-010`

### ACT-006 · 创建房间
- **位置**：`pages/versus/versus.js` 的 `onCreateRoom`
- **职责**：抽题 + 取匿名标识 → 调云函数建房间。
- **上游**：`ACT-006`
- **下游**：`API-003` → `API-004` 轮询

### ACT-007 · 提交对攻答案
- **位置**：`pages/versus/versus.js` 的 `onSubmit`
- **职责**：提交断点与谬误类型，标记 `myAnswered`。
- **上游**：`API-005`
- **下游**：`ACT-008`

### ACT-008 · 检查合并状态
- **位置**：`pages/versus/versus.js` 的 `checkMerged`
- **职责**：双方都提交才触发结算。**这是强制协作的机制核心。**
- **上游**：`API-006`
- **下游**：`bothReady` → 结算

### FLOW-004 · 对攻完整流程
- **位置**：`pages/versus/versus.js` 全流程
- **职责**：idle → waiting → ready → finished 四态流转。
- **上游**：`PAGE-002` 全生命周期
- **下游**：见上文
- **降级**：网络不可用时不阻断，单机模式仍可玩

---

## 5. 训练层模块（含 v2.1 新增）

### PAGE-004 · 训练页
- **位置**：`pages/train/train.js`
- **职责**：三模式切换——每日三题 / 论证质量 / 怎么回。
- **上游**：`STORE-001`
- **下游**：`STORE-002`

### UI-011 · 模式切换条
- **位置**：`pages/train/train.wxml` 的 `.mode-switch`
- **职责**：切换三个训练模式。**ARG 与杠精模块仅在此可见。**
- **上游**：`ACT-009`
- **下游**：`PAGE-004`

### UI-012 · ARG 三关选项
- **位置**：`pages/train/train.wxml` 的 ARG 模块
- **职责**：A / R / G 三个维度选择。
- **上游**：`ACT-010`
- **下游**：`RULE-007`

### UI-013 · 隐藏前提展示
- **位置**：`pages/train/train.wxml` 的 `.hidden-premise`
- **职责**：答完后揭示被藏起来的言外之意。
- **上游**：`data/extended-bank.js` 的 `hiddenPremise`
- **下游**：`UI-013`

### UI-014 · 策略建议卡
- **位置**：`pages/train/train.wxml` 的 `.strategy`
- **职责**：杠精模块的应对策略与话术模板。
- **上游**：`RULE-009`
- **下游**：`PAGE-004`

### UI-015 · 连续天数条
- **位置**：`pages/train/train.wxml` 的 `.streak-row`
- **职责**：显示连续天数 + 「漏一天不影响」提示。
- **上游**：`RULE-010` 计算
- **下游**：`PAGE-004`

### ACT-009 · 切换训练模式
- **位置**：`pages/train/train.js` 的 `onStartMode` / `onSwitchArg` / `onSwitchTroll`
- **职责**：切换三种训练形态。
- **上游**：`UI-011`
- **下游**：`PAGE-004`

### ACT-010 · ARG 判定提交
- **位置**：`pages/train/train.js` 的 `onArgSubmit`
- **职责**：提交 A/R/G 选择，产出定向反馈。
- **上游**：`ACT-010`
- **下游**：`RULE-007` → `STORE-002`

### ACT-011 · 杠精应对选择
- **位置**：`pages/train/train.js` 的 `onTrollSubmit`
- **职责**：选出最佳应对策略。
- **上游**：`ACT-011`
- **下游**：`RULE-009` → `STORE-002`

### ACT-012 · 自检我的说法
- **位置**：`pages/train/train.js` 的 `onArgSelfCheck`
- **职责**：用四关检查自己的论证。
- **上游**：`RULE-009` 的 `selfCheck`
- **下游**：见上文

### FLOW-005 · 每日抽题流程
- **位置**：`pages/train/train.js` 的 `loadDailyQuestions`
- **职责**：从 77 题池按薄弱分组 → 单维 → 轮换优先 → **qid 去重** → 组间隔抽取 3 题。
- **上游**：`STORE-001`
- **下游**：`PAGE-004`

### FLOW-006 · ARG 训练流程
- **位置**：`pages/train/train.js` 的 `onSwitchArg` → `onArgSubmit`
- **职责**：抽题 → 三关选择 → 判定 → 揭示隐藏前提。
- **上游**：`CAP-006`
- **下游**：`ACT-010` → `STORE-002`

### FLOW-007 · 杠精训练流程
- **位置**：`pages/train/train.js` 的 `onSwitchTroll` → `onTrollSubmit`
- **职责**：抽对话 → 选应对 → 出话术。
- **上游**：`CAP-007`
- **下游**：`ACT-011` → `STORE-002`

---

## 6. 我的与隐私模块

### PAGE-005 · 我的页
- **位置**：`pages/profile/profile.js`
- **职责**：累计答题、关于说明、审核合规说明、清空数据。
- **上游**：`STORE-001`
- **下游**：`ACT-013`

### UI-016 · 数据清空入口
- **位置**：`pages/profile/profile.wxml` 的 `.menu-danger`
- **职责**：二次确认后清空全部本地数据。
- **上游**：`ACT-013`
- **下游**：`STORE-001` 清空

### UI-017 · 免责声明区
- **位置**：`pages/fingerprint/fingerprint.wxml` 与 `profile.wxml`
- **职责**：常驻展示「不预测任何未来表现」。**合规要求，不可移除。**
- **上游**：`RULE-011` 提供文案
- **下游**：见上文

### ACT-013 · 清空全部数据
- **位置**：`pages/profile/profile.js` 的 `onClearData`
- **职责**：`wx.showModal` 二次确认 → `app.clearAll()`。
- **上游**：`UI-016`
- **下游**：`STORE-001` / `STORE-003`

---

## 7. 云函数接口层

### API-001 · 生成匿名标识
- **位置**：`cloudfunctions/identity/index.js`
- **职责**：返回匿名串用于对攻房间归属。**不返回 openid、不落库、30 分钟窗口轮换。**
- **上游**：`app.js` 的 `fetchOpenid`
- **下游**：见规则层判定
- **下游**：`PAGE-002` 的所有请求携带
- **降级**：云开发不可用时降级为本地随机 ID（`STORE-005`）

### API-002 · 服务端合规复核
- **位置**：`cloudfunctions/generate-card/index.js`
- **职责**：独立维护禁用词库，二次校验卡片内容。**不复用客户端代码，避免被篡改后失效。**
- **上游**：预留，当前卡片走本地绘制
- **下游**：见规则层判定

### API-003 · 创建对攻房间
- **位置**：`cloudfunctions/versus-service/index.js` 的 `createRoom`
- **职责**：生成 6 位房间号，登记房主与题目 ID。
- **上游**：`ACT-006`
- **下游**：见规则层判定
- **输入**：`{ action:'create', openid, questionId }`

### API-004 · 轮询对手状态
- **位置**：`cloudfunctions/versus-service/index.js` 的 `pollRoom`
- **职责**：判断对手是否加入。**房间 10 分钟无活动即失效。**
- **上游**：`ACT-006` 后的定时器（2 秒间隔）
- **下游**：见规则层判定
- **限流**：单用户 1 次 / 3 秒

### API-005 · 提交对攻答案
- **位置**：`cloudfunctions/versus-service/index.js` 的 `submitAnswer`
- **职责**：按房主/对手身份分别写入断点与谬误类型。
- **上游**：`ACT-007`
- **下游**：见规则层判定

### API-006 · 检查合并状态
- **位置**：`cloudfunctions/versus-service/index.js` 的 `checkMerged`
- **职责**：返回 `bothReady`，这是**强制协作的判定点**。
- **上游**：`ACT-008`
- **下游**：见规则层判定

---

## 8. 数据存储层

### STORE-001 · 答题日志
- **位置**：`app.js` 的 `loadLogs` / `addLog` / `clearAll`
- **存储键**：`pz_logs`
- **职责**：**指纹与训练优先级的唯一数据源。** 纯本地，不上传。
- **写入方**：`ACT-003`、`ACT-010`、`ACT-011`
- **读取方**：`FLOW-003`、`FLOW-005`、`PAGE-005`
- **字段**：`ts, qid, levelId, fallacyKey, correct, fellInto, mode, durationMs`

- **上游**：CAP-002 指纹计算 · FLOW-005 每日抽题
- **下游**：PAGE-005 累计答题展示
### STORE-002 · 训练记录
- **位置**：`app.js` 的 `addLog`（`mode: 'train_arg' | 'train_troll'`）
- **存储键**：`pz_logs`（与 STORE-001 同库，用 mode 区分）
- **职责**：记录 ARG 与杠精模块的作答。
- **专属字段**：`argDimension, argPicked, argCorrect` / `trollStopAt, trollBranch, trollPicked, trollCorrect`

- **上游**：ACT-010 ARG 判定 · ACT-011 杠精判定
- **下游**：RULE-005 指纹聚合（training 模式）
### STORE-003 · 关卡解锁进度
- **位置**：`pages/solo/solo.js` 的 `onLoad` / `markLevelPassed`
- **存储键**：`pz_solo_passed`
- **职责**：记录已通过关卡，控制 `chip-locked` 状态。
- **写入方**：`FLOW-002`
- **读取方**：`UI-001`

- **上游**：FLOW-002 关卡推进
- **下游**：UI-001 关卡选择条解锁态
### STORE-004 · 对攻房间状态
- **位置**：`cloudfunctions/versus-service/index.js` 的 `pz_rooms` 集合
- **职责**：云端房间状态。10 分钟 TTL。
- **字段**：`roomId, hostId, guestId, hostAnswered, guestAnswered, hostBreakpoint, guestBreakpoint, questionId`
- **约束**：房间 TTL 到期或双方答案齐备后失效

- **上游**：API-003 创建 · API-005 提交
- **下游**：API-006 合并检查
### STORE-005 · 本地匿名标识
- **位置**：`app.js` 的 `fetchOpenid` 降级分支
- **存储键**：`pz_local_id`
- **职责**：云开发不可用时的本地兜底标识，保证单机可玩。

- **上游**：API-001 降级分支
- **下游**：PAGE-002 对攻房间归属
### STORE-006 · 当前会话
- **位置**：`app.js` 的 `startSolo` / `recordAnswer` / `finishSession`
- **存储键**：`pz_session`
- **职责**：单闯会话内的临时状态，结束后合并进 `STORE-001`。
- **上游**：CAP-002 指纹计算 · FLOW-005 每日抽题
- **下游**：PAGE-005 累计答题展示

---

## 9. 规则与算法层

### RULE-001 · 形式类真值表判定
- **位置**：`utils/argue-engine.js` 的 `verifyFormDeduction`
- **职责**：穷举 P、Q 全部赋值，判断推理是否有效。
- **判定结果**：
  ```
  P→Q, P⟹Q     有效（肯定前件）
  P→Q, ¬Q⟹¬P   有效（否定后件/逆否）
  P→Q, Q⟹P     无效 ← 肯定后件谬误
  P→Q, ¬P⟹¬Q   无效 ← 否定前件谬误
  ```
- **下游**：`FLOW-002`、`TEST-001`
- ⚠️ **不可改为 AI 判断**。这是产品可信度的基础。

### RULE-002 · 单题判定与反馈
- **位置**：`utils/argue-engine.js` 的 `evaluate` / `buildFeedback`
- **职责**：比对断点位置 + 谬误类型，生成言语反馈。
- **输入**：`{ breakpointFrom, breakpointTo, fallacyKey }`
- **输出**：`{ correct, correctBreakpoint, correctFallacy, feedbackText }`

- **上游**：ACT-003 提交作答
- **下游**：STORE-001 写入 + UI-005 反馈渲染
### RULE-003 · 对攻双重判定
- **位置**：`pages/versus/versus.js` 的 `settle`
- **职责**：**断点位置与谬误类型都对才算抓到**，并给出细分反馈。
- **输出细分**：「断点位置找错了」vs「位置对了，但谬误类型判断错了」

- **上游**：API-006 双方答案齐备
- **下游**：UI-010 结算结果卡
### RULE-004 · 15 类谬误定义
- **位置**：`utils/argue-engine.js` 的 `FALLACIES`
- **职责**：15 类谬误的 id、名称、分组、形式表达、原因说明。
- **分组**：
  | 组 | 数量 | 成员 |
  |---|---|---|
  | 形式 | 4 | 肯定后件 · 否定前件 · 合成 · 归谬 |
  | 论证 | 6 | 诉诸无知/权威/大众/情感 · 以偏概全 · 背景绝对化 |
  | 语义 | 5 | 偷换概念 · 滑坡 · 稻草人 · 归因 · 转移话题 |

- **上游**：data/ 四个题库的fallacyKey
- **下游**：UI-004 谬误选择器 · RULE-007 ARG 映射
### RULE-005 · 指纹聚合算法
- **位置**：`utils/argue-engine.js` 的 `computeFingerprint`
- **职责**：按维度聚合 → 贝叶斯平滑 → 分组排序 → 场合敏感度检测。
- **分级门槛**：`minSamples:3` 入榜，`highSamples:8` 高置信
- **贝叶斯平滑**：`bayesScore(correct, total)` —— 3 题全对 = 80 分而非 100分

- **上游**：STORE-001 答题日志
- **下游**：PAGE-003 指纹展示
### RULE-006 · 送答案防护
- **位置**：`tests/e2e.test.js` 第 5b 节
- **职责**：扫描页面代码，禁止出现 `breakpointFrom: q.breakpoint.from` 一类**直接把正确答案当用户提交值**的写法。
- **原理**：这类 bug 会让用户永远答对，指纹与刻度全部失真。

- **上游**：页面代码扫描
- **下游**：TEST-003 回归检测
### RULE-007 · ARG 三关判定
- **位置**：`utils/arg-framework.js` 的 `evaluateARG`
- **职责**：独立判定 A/R/G 三关，返回失守点与完整度。
- **关键设计**：**逐项独立判定，不追求整段论证的唯一总分。** 这样即使整体评价有争议，单关仍可判定。

- **上游**：ACT-010 ARG 提交
- **下游**：STORE-002 记录 + UI-012 反馈
### RULE-008 · ARG 模式边界
- **位置**：`utils/arg-framework.js` 的 `argEnabledFor`
- **职责**：强制 ARG 只在训练层与月测出现。
- **约束表**：
  ```
  solo    首测   ARG 禁用
  versus  对攻   ARG 禁用
  train   训练   ARG 启用
  monthly 月测   ARG 启用
  ```
- **理由**：首测目标是「让用户发现自己不知道」，ARG 会让 3 分钟首测超载。

- **上游**：页面模式标识（solo/versus/train/monthly）
- **下游**：TEST-003 边界断言
### RULE-009 · 杠精四关筛查
- **位置**：`utils/troll-screen.js` 的 `screen`
- **职责**：线性通过制，**在第一个未通过的关卡停下**。
- **四关**：① 有没有给理由 ② 理由是真的吗 ③ 理由和结论相关吗 ④ 推理片面吗
- **第 3 关双分支**：
  | 分支 | 识别 | 正确应对 |
  |---|---|---|
  | 稻草人 | 攻击被扭曲的版本 | 澄清定义 |
  | 错误诉诸 | 用不相干背景否定 | 承认 → 切割 → 引导 |
- ⚠️ **`screen()` 与 `selfCheck()` 默认值语义相反**：
  - `screen()` 判断他人 → 默认全通过（不主动指控）
  - `selfCheck()` 判断自己 → 缺参数视为未声明（必须显式声明）

- **上游**：ACT-011 杠精提交 · ACT-012 自检
- **下游**：STORE-002 记录 + UI-014 策略卡
### RULE-010 · 连续天数计算
- **位置**：`app.js` 的 `computeStreak`
- **职责**：计算连续训练天数，**允许漏一天**。
- ⚠️ **不能用 `toDateString()` 排序** —— 返回如 `"Sat Oct 10 2026"`，
  按字母排序时 `"Oct 10"` 会排在 `"Oct 08"` 之前。必须归一化为 `YYYY-MM-DD` 数字键。
- **依据**：Lally et al. (2010, N=96) 漏一天不实质影响习惯形成

- **上游**：STORE-001 时间戳
- **下游**：UI-015 连续天数条
### RULE-011 · 合规过滤
- **位置**：`utils/compliance.js`
- **职责**：40+ 禁用词硬过滤 + `[内部]` 前缀豁免 + 免责声明 + 提审话术。
- **对外 API**：`checkText(text)` → `{ safe, hits }`；`sanitize(text)`
- **豁免机制**：`EXEMPT_PREFIX` 使提审话术能原样保留「分享不解锁任何功能」这句声明

- **上游**：所有文案出口（题库/反馈/分享/页面）
- **下游**：TEST-002 禁用词扫描 + TEST-003 源码扫描
### RULE-012 · 欧拉图判定（设计中）
- **位置**：`utils/euler-diagram.js` 的 `buildEulerQuestion` / `evaluateEuler`
- **职责**：形式组三类谬误的同心圆可视化。
- **铁律**：「当我们说 A 是 B 的时候，前面的 A 是小圈，后面的 B 是大圈」
- **判定本质**：**蓝点（图上允许但结论未覆盖的位置）存在 ⇒ 逻辑错误**
- **状态**：引擎已建，页面未接入

- **上游**：形式组三类谬误
- **下游**：CAP-008（引擎已建，页面待接入）
### RULE-013 · 抽样策略
- **位置**：`pages/train/train.js` 的 `loadDailyQuestions`
- **职责**：优先级排序——薄弱分组 → 单维 → 轮换题优先 → qid 去重 → 组间隔。
- **依据**：Sailer & Homner (2020) 交错练习结论

---

- **上游**：STORE-001 历史记录
- **下游**：PAGE-004 每日三题
## 10. 测试与校验层

### TEST-001 · 引擎正确性
- **位置**：`tests/engine.test.js`
- **职责**：验证引擎的数学与结构正确性。
- **规模**：60 项
- **覆盖**：真值表穷举、贝叶斯平滑、指纹算法、15 维完整性、组间均衡
- **上游**：`utils/argue-engine.js` 的全部导出
- **下游**：门禁 CI，无下游业务节点

### TEST-002 · 题库校验
- **位置**：`tools/validate-bank.js`
- **职责**：验证题库内容合规且结构完整。
- **规模**：76 项
- **覆盖**：题库规模、禁用词扫描、结构完整性、维度合法性、真值表验证、难度标定、ARG 标注一致性、杠精素材有效性
- **上游**：`data/` 四个题库 + `utils/compliance.js`
- **下游**：门禁 CI，无下游业务节点

### TEST-003 · 端到端流程
- **位置**：`tests/e2e.test.js`
- **规模**：81 项
- **职责**：验证完整用户旅程、合规红线与基础设施完整性。
- **覆盖**：完整流程、合规红线扫描、送答案回归、基础设施完整性、ARG 模式边界、杠精四关线性通过制、15 维完整性
- **上游**：`pages/` 全部页面 + `utils/` 全部模块
- **下游**：门禁 CI，无下游业务节点

### TEST-004 · 语法校验
- **位置**：命令行内联脚本（无独立文件），可用 `node -e "new Function(...)"` 实现
- **职责**：验证 24 个源文件的 JS 语法可解析。
- **上游**：项目全部 `.js` 文件
- **下游**：门禁 CI，无下游业务节点

---

## 11. 关键约束（不可违反）

> 这一节比功能清单更重要。**清单漏了你会多做，约束漏了你会破坏已有正确的东西。**

### 硬约束

| ID | 约束 | 强制方式 |
|---|---|---|
| C-001 | ARG 不得出现在首测/对攻/指纹页 | `RULE-008` + TEST-003 |
| C-002 | 形式类必须用真值表，不得交给 AI 判断 | TEST-001 |
| C-003 | 谬误类型必须由用户作答 | `RULE-006` + TEST-003 |
| C-004 | 分享不得设奖励、不得解锁内容（3.2.1） | TEST-003 正则扫描 |
| C-005 | 首测流程零广告（3.2.2） | TEST-003 |
| C-006 | 不出现人格类型标签（3.2.4） | `RULE-011` + TEST-002 |
| C-007 | 三组题量极差 ≤ 2 | TEST-001 保证聚合指纹均衡 |
| C-008 | 每维题量≥ 3（`minSamples`门槛） | TEST-002 |

### 软约束

| ID | 约束 | 理由 |
|---|---|---|
| S-001 | 不做进度条 | Yu, Yu & Li (2024) 元分析：唯一被点名为无效的元素 |
| S-002 | 不用答对得积分 | Deci et al. (1999, 128 实验)：d=−0.40 |
| S-003 | 只用正面言语反馈 | 同上：唯一正向外在刺激 d=+0.33 |
| S-004 | 断签不清零 | Lally et al. (2010)：漏一天不实质影响习惯形成 |
| S-005 | 不做全球排行榜 | Balci et al. (2022, N=190 随机对照)：零效果 |

---

## 12. 影响范围速查

改动以下内容时，**必须同步检查**列出的文件：

| 改什么 | 必须同步检查 |
|---|---|
| 维度数量 | engine.test · validate-bank · e2e.test · argue-engine 注释 |
| 谬误定义 | argue-engine · 三个题库 · arg-framework映射 · 页面选项 |
| 题库内容 | validate-bank · e2e.test · 对应页面 |
| ARG 逻辑 | arg-framework · e2e.test（边界断言） |
| 杠精四关 | troll-screen · extended-bank · e2e.test |
| 存储键名 | app.js · 各页面读写处 |
| 云函数接口 | 对应页面调用处 · 云函数自身 |
| 合规词库 | compliance.js · e2e.test 扫描范围 |

---

## 13. 未接入资产

| 资产 | 位置 | 状态 |
|---|---|---|
| 欧拉图引擎 | `utils/euler-diagram.js` | 引擎完成（273 行），**页面未接入** |
| 金字塔三层结构 | 设计完成 | 未实施（6 种分类全合乎 MECE，需先定唯一答案口径） |
| MECE 第一步 | 设计完成 | 未实施（只取「统一分类标准」，不做「穷尽」） |
| 月测模块 | 边界已定义 | 未实施（`RULE-008` 已预留 monthly 模式） |

---

> **维护提示**：本地图的价值在于「改什么 → 影响哪里 → 怎么验证」的映射。
> 若发现代码与地图不符，**以代码为准并立即更新地图** —— 失效的地图比没有地图更危险。