# 《破招》功能逻辑地图

> **用法**：先看「速查表」定位改动点→ 看「依赖树」确认影响面 → 需要细节时查「节点详表」。
> **回答四个问题**：改什么？影响哪里？不能动什么？怎么验证？
>
> 生成时间：2026-10-14 · 代码规模 5850 行 / 24 个源文件 · 79 个节点
> **维护**：改代码时同步更新本文件。**改代码必须改地图**，否则地图即失效。

### 配套图示

图是表的辅助，用于快速建立整体印象。**本文件（表格）是可 diff 的真相源。**

| 图 | 内容 | 对应本文章节 |
|---|---|---|
| [01 全景与依赖热度](diagrams/01-overview.svg) | 四个Tab 页 + 五个工具模块的被依赖次数 | 一、速查表 / 二、依赖树 |
| [02 首测答题链路](diagrams/02-chain.svg) | 从进页到出指纹的 7 步，每步标注节点 ID 与约束 | 三、主链路 |
| [03 训练层与 ARG 边界](diagrams/03-training.svg) | 三种训练模式 + ARG 启用/禁用清单 | 四、节点详表 |

重新生成：`node tools/gen-map-diagrams.js`

---

## 一、速查表（改什么 → 影响哪里）

**用法**：确定要改的东西后查连带影响。这是最高频入口。

| 改什么 | 必须同步检查 | 漏了会怎样 |
|---|---|---|
| **维度数量** | `tests/engine.test.js` · `tools/validate-bank.js` · `tests/e2e.test.js` · `utils/argue-engine.js` 注释 | 测试断言失败或注释与代码不符 |
| **谬误定义 / 分组** | `data/` 四个题库 · `utils/arg-framework.js` 的 `ARG_MAPPING` · `pages/*` 选项列表 | 选项缺项或映射失效 |
| **题库内容** | `tools/validate-bank.js` · `tests/e2e.test.js` · 对应页面引用 | 合规校验失败 |
| **ARG 判定逻辑** | `tests/e2e.test.js` 第 5d 节 | 边界断言失败 |
| **杠精四关** | `utils/troll-screen.js` · `data/extended-bank.js` · `tests/e2e.test.js` | 筛查逻辑与题库不一致 |
| **合规词库** | `utils/compliance.js` · `tests/e2e.test.js` 扫描范围 | 禁用词漏检 |
| **存储键名** | `app.js` · 各页面读写处 | 历史数据读不到，进度丢失 |
| **云函数接口** | 对应页面调用处 · 云函数自身 | 调用失败或数据不一致 |
| **页面组件** | `pages/x/x.wxml` + `x.wxss` + `x.js` | 渲染异常 |

### 9 类节点速查

| 前缀 | 含义 | 数量 | 代表节点 |
|---|---|---|---|
| CAP | 产品能力 | 8 | CAP-001 论证拆招测评 |
| PAGE | 页面 | 5 | PAGE-001 单闯页 |
| UI | 按钮、组件 | 17 | UI-003 卡片选择区 |
| ACT | 用户动作 | 13 | ACT-003 提交作答 |
| FLOW | 业务流程 | 7 | FLOW-001 首测答题流程 |
| API | 接口 / 云函数 | 6 | API-001 生成匿名标识 |
| STORE | 数据存储 | 6 | STORE-001 答题日志 |
| RULE | 规则 / 算法 | 13 | RULE-001 真值表判定 |
| TEST | 测试 / 校验 | 4 | TEST-003 端到端流程 |

**编号规则**：同类 ID 从 001 递增，**永不复用**（节点删除也保留空号）。

---

## 二、依赖树（谁依赖谁）

**用法**：改某个模块前，先数它被谁依赖。

```
utils/argue-engine.js ← 核心引擎，被 6 处依赖（风险最高）
  │
  ├─→ pages/solo/solo.js        单闯页的谬误选项
  ├─→ pages/train/train.js     训练层的选项与抽样
  ├─→ pages/versus/versus.js    对攻页的选项
  ├─→ tests/engine.test.js      引擎测试
  ├─→ tests/e2e.test.js         端到端边界检测
  └─→ tools/validate-bank.js    题库校验

utils/compliance.js ← 合规层，出口唯一
  │
  ├─→ pages/solo/solo.js        反馈文案 sanitize
  ├─→ pages/fingerprint/        免责声明 + 描述清洗
  ├─→ pages/profile/profile.js  隐私说明
  ├─→ tests/*                   三套测试的禁用词扫描
  └─→ tools/validate-bank.js    题库全量扫描

utils/arg-framework.js ← ARG 三维，仅训练层
  ├─→ pages/train/train.js      唯一调用方
  └─→ tests/e2e.test.js         模式边界断言

utils/troll-screen.js ← 杠精四关，仅训练层
  ├─→ pages/train/train.js
  └─→ tests/e2e.test.js

utils/euler-diagram.js ← 欧拉图【引擎已建，页面未接入】

data/（四个题库）
  ├─→ pages/solo/solo.js        叙事题（首测）
  ├─→ pages/train/train.js      每日抽题池
  ├─→ pages/versus/versus.js    对攻抽题
  └─→ tools/validate-bank.js    全量校验

app.js ← 全局状态
  ├─→ pages/*（getFingerprint / addLog / clearAll）
  └─→ cloudfunctions/identity   匿名标识获取

cloudfunctions/
  ├─→ identity匿名标识（无 openid，不落库）
  ├─→ versus-service            对攻房间（限流 1次/3s + 10min TTL）
  └─→ generate-card             服务端合规复核
```

### 热度排行（改动风险最高的位置）

| 位置 | 被依赖次数 | 风险 | 说明 |
|---|---|---|---|
| `utils/argue-engine.js` | 6 | **高** | 改它几乎要全测 |
| `utils/compliance.js` | 5 | **高** | 合规红线 |
| `data/levels.js` | 4 | 中 | 以内容改动为主 |
| `app.js` | 3+ | **高** | 全局状态 |
| `utils/arg-framework.js` | 2 | 低 | 边界清晰 |

---

## 三、主链路（单行流程）

```
CAP-001 论证拆招测评
  │
  ├─ PAGE-001 单闯页 ── UI-001 关卡条
  │       │              UI-003 卡片区──┐
  │       │              UI-004 谬误选择┴─ ACT-001 选断点
  │       │              ACT-002 选类型
  │       │                    │
  │       │              ACT-003 提交
  │       │                    │
  │       │         FLOW-001 答题流程（5关×3题）
  │       │                    ▼
  │       │      RULE-001 真值表 / RULE-002 单题判定
  │       │                    │
  │       │                    ▼
  │       │        STORE-001 答题日志（pz_logs）
  │       │           ├──────────────┐
  │       │           ▼              ▼
  │       │   RULE-005 指纹聚合   PAGE-003 指纹页
  │       │           │              │
  │       │   describePattern    CAP-005 卡片
  │       │           │              │
  └───────┴───────────┴──────┬───────┘
                             ▼
                      PAGE-005 我的（累计 + 清空）
```

### 四态流转（对攻）

```
idle ──创建房间──► waiting ──对手加入──► ready ──双方提交──► finished
  │                   │                    │
  │                   │                    └─► UI-010 结算
  └─网络不可用──────► 降级为本地单机模式
```

---

## 四、节点详表

> 79 个节点。位置精确到函数名——只写文件名在大文件里会失效。

### 4.1 能力层 CAP

| ID | 名称 | 位置 | 职责 | 上下游 |
|---|---|---|---|---|
| CAP-001 | 论证拆招测评 | `pages/solo/solo.js` | 五关叙事拆招，零门槛主入口 | 上 PAGE-001 · 下 FLOW-001→STORE-001 |
| CAP-002 | 论证指纹 | `argue-engine.js` 的 `computeFingerprint` | 聚合三组表现 + 叙述性结论 | 上 STORE-001 · 下 PAGE-003 |
| CAP-003 | 同题对攻 | `pages/versus/versus.js` | 合并答案后交卷，强制协作 | 上 API-003 · 下 STORE-004 |
| CAP-004 | 训练层 | `train.js` 的 `loadDailyQuestions` | 每日三题 + ARG + 杠精三模块 | 上 STORE-001 · 下 STORE-002 |
| CAP-005 | 分享卡片 | `fingerprint.js` 的 `drawCard` | canvas 本地绘制，离线可用 | 上 CAP-002 · 下 微信转发 |
| CAP-006 | ARG 评估 | `arg-framework.js` 的 `evaluateARG` | A/R/G 三关判定 | 上 PAGE-004 · 下 STORE-002 |
| CAP-007 | 杠精应对 | `troll-screen.js` 的 `screen` | 四关线性筛查 + 应对话术 | 上 PAGE-004 · 下 STORE-002 |
| CAP-008 | 欧拉图 | `euler-diagram.js` 的 `buildEulerQuestion` | 形式组同心圆可视化【引擎已建，页面未接入】 | 上 形式组三类 · 下 计划接 PAGE-001 |

### 4.2 页面 PAGE

| ID | 名称 | 位置 | 职责 | 上下游 |
|---|---|---|---|---|
| PAGE-001 | 单闯页 | `pages/solo/solo.js` | 五关主承载，TabBar 首页 | 上 STORE-003 · 下 ACT-001/002/003 |
| PAGE-002 | 对攻页 | `pages/versus/versus.js` | 四态流转 idle→waiting→ready→finished | 上 API-003 · 下 STORE-004 |
| PAGE-003 | 指纹页 | `pages/fingerprint/fingerprint.js` | 展示三组表现与模式描述 | 上 STORE-001 · 下 CAP-005 |
| PAGE-004 | 训练页 | `pages/train/train.js` | 三模式切换 | 上 STORE-001 · 下 STORE-002 |
| PAGE-005 | 我的页 | `pages/profile/profile.js` | 累计、隐私、清空数据 | 上 STORE-001 · 下 ACT-013 |

### 4.3 组件 UI

| ID | 名称 | 位置 | 职责 | 上下游 |
|---|---|---|---|---|
| UI-001 | 关卡选择条 | `solo.wxml` 的 `.levels` | 横向滚动，`chip-locked` 表未解锁 | 上 STORE-003 · 下 PAGE-001 |
| UI-002 | 方向标签 | `solo.wxml` 的 `.scene-head` | 向上/向外/向内记忆锚点 | 上 levels 的 `direction` · 下 PAGE-001 |
| UI-003 | 卡片选择区 | `solo.wxml` 的 `.cards` | 前提卡与结论卡 | 上 题库 `cards` · 下 ACT-001 |
| UI-004 | 谬误选择器 | `solo.wxml` 的 `.options` | 15 类 chip | 上 RULE-004 · 下 ACT-002 |
| UI-005 | 结果反馈区 | `solo.wxml` 的 `.feedback` | 展示判定与提示 | 上 RULE-002 · 下 ACT-004 |
| UI-006 | 分组表现卡 | `fingerprint.wxml` 的 `.group-item` | 三组双条形图 | 上 RULE-005 · 下 PAGE-003 |
| UI-007 | 离屏 canvas | `fingerprint.wxml` 的 `canvas#pzCard` | 卡片绘制画布 | 上 ACT-005 · 下 临时文件 |
| UI-008 | 场合敏感度 | `fingerprint.wxml` 的 `.scene-item` | 最易失守场合 | 上 RULE-005 · 下 PAGE-003 |
| UI-009 | 合并状态指示 | `versus.wxml` 的 `.merge-status` | 双方提交状态 | 上 API-004 · 下 PAGE-002 |
| UI-010 | 结算结果卡 | `versus.wxml` 的 `.result-block` | 双方是否抓到 | 上 RULE-003 · 下 PAGE-002 |
| UI-011 | 模式切换条 | `train.wxml` 的 `.mode-switch` | 三模式切换 | 上 ACT-009 · 下 PAGE-004 |
| UI-012 | ARG 三关选项 | `train.wxml` ARG 模块 | A/R/G 选择 | 上 RULE-007 · 下 ACT-010 |
| UI-013 | 隐藏前提展示 | `train.wxml` 的 `.hidden-premise` | 揭示言外之意 | 上 extended-bank 的 `hiddenPremise` |
| UI-014 | 策略建议卡 | `train.wxml` 的 `.strategy` | 应对策略与话术 | 上 RULE-009 · 下 PAGE-004 |
| UI-015 | 连续天数条 | `train.wxml` 的 `.streak-row` | 连续天数 + 漏一天提示 | 上 RULE-010 · 下 PAGE-004 |
| UI-016 | 数据清空入口 | `profile.wxml` 的 `.menu-danger` | 二次确认清空 | 上 ACT-013 · 下 STORE-001 |
| UI-017 | 免责声明区 | `fingerprint.wxml` 与 `profile.wxml` | 合规要求，**不可移除** | 上 RULE-011 |

### 4.4 用户动作 ACT

| ID | 名称 | 位置 | 职责 | 上下游 |
|---|---|---|---|---|
| ACT-001 | 选择断点起点 | `solo.js` 的 `onCardTap` | 记录断点位置 | 上 UI-003 · 下 ACT-003 |
| ACT-002 | 选择谬误类型 | `solo.js` 的 `onFallacyTap` | 记录谬误种类 | 上 UI-004 · 下 ACT-003 |
| ACT-003 | 提交作答 | `solo.js` 的 `onSubmit` | 合并两者交判定 | 上 ACT-001/002 · 下 RULE-002→STORE-001 |
| ACT-004 | 微信转发 | `solo.js` 的 `onShareAppMessage` | 合规分享，不设奖励 | 上 PAGE-001 · 下 微信面板 |
| ACT-005 | 生成卡片 | `fingerprint.js` 的 `drawCard` | canvas 绘制导出 | 上 CAP-002 · 下 UI-007→相册 |
| ACT-006 | 创建房间 | `versus.js` 的 `onCreateRoom` | 抽题+取标识→建房 | 上 PAGE-002 · 下 API-003→API-004 |
| ACT-007 | 提交对攻答案 | `versus.js` 的 `onSubmit` | 提交断点与类型 | 上 UI-003/004 · 下 API-005 |
| ACT-008 | 检查合并状态 | `versus.js` 的 `checkMerged` | 双方齐备才结算 | 上 API-006 · 下 RULE-003 |
| ACT-009 | 切换训练模式 | `train.js` 的 `onSwitchArg` 等 | 切换三形态 | 上 UI-011 · 下 PAGE-004 |
| ACT-010 | ARG 判定提交 | `train.js` 的 `onArgSubmit` | 提交 A/R/G 选择 | 上 UI-012 · 下 RULE-007→STORE-002 |
| ACT-011 | 杠精应对选择 | `train.js` 的 `onTrollSubmit` | 选出最佳策略 | 上 UI-014 · 下 RULE-009→STORE-002 |
| ACT-012 | 自检我的说法 | `train.js` 的 `onArgSelfCheck` | 四关自查 | 上 RULE-009 · 下 弹窗 |
| ACT-013 | 清空全部数据 | `profile.js` 的 `onClearData` | 二次确认→`clearAll` | 上 UI-016 · 下 STORE-001/003 |

### 4.5 业务流程 FLOW

| ID | 名称 | 位置 | 职责 | 上下游 |
|---|---|---|---|---|
| FLOW-001 | 首测答题流程 | `solo.js` 的 `onLoad`→`onNext` | 5 关 × 3 题 = 15 题，首关 ≤90s | 上 PAGE-001 · 下 CAP-002 |
| FLOW-002 | 关卡推进流程 | `solo.js` 的 `markLevelPassed` | 写 `pz_solo_passed`，解锁下关 | 上 ACT-003 · 下 STORE-003→UI-001 |
| FLOW-003 | 指纹生成流程 | `argue-engine.js` 的 `computeFingerprint` | 聚合→平滑→排序→结论 | 上 STORE-001 · 下 PAGE-003 |
| FLOW-004 | 对攻完整流程 | `versus.js` 全流程 | 四态流转，网络不可用可降级 | 上 PAGE-002 · 下 结算 |
| FLOW-005 | 每日抽题流程 | `train.js` 的 `loadDailyQuestions` | 弱组→单维→轮换→去重→组间隔 | 上 STORE-001 · 下 PAGE-004 |
| FLOW-006 | ARG 训练流程 | `train.js` 的 `onSwitchArg`→`onArgSubmit` | 抽题→三关→揭示前提 | 上 CAP-006 · 下 STORE-002 |
| FLOW-007 | 杠精训练流程 | `train.js` 的 `onSwitchTroll`→`onTrollSubmit` | 抽对话→选应对→出话术 | 上 CAP-007 · 下 STORE-002 |

### 4.6 云函数 API

| ID | 名称 | 位置 | 职责 | 上下游 |
|---|---|---|---|---|
| API-001 | 生成匿名标识 | `cloudfunctions/identity/index.js` | **不返回 openid、不落库**、30min 窗口轮换 | 上 `app.js` 的 `fetchOpenid` · 下 PAGE-002 全部请求 |
| API-002 | 服务端合规复核 | `cloudfunctions/generate-card/index.js` | 独立禁用词库，防客户端被篡改 | 上 预留 · 下 合规二次校验 |
| API-003 | 创建对攻房间 | `versus-service/index.js` 的 `createRoom` | 6 位房间号，登记房主与题目 | 上 ACT-006 · 下 STORE-004 |
| API-004 | 轮询对手状态 | `versus-service/index.js` 的 `pollRoom` | 房间 10min TTL，限流 1次/3s | 上 ACT-006 定时器 · 下 UI-009 |
| API-005 | 提交对攻答案 | `versus-service/index.js` 的 `submitAnswer` | 按身份分别写入 | 上 ACT-007 · 下 STORE-004 |
| API-006 | 检查合并状态 | `versus-service/index.js` 的 `checkMerged` | 返回 `bothReady`，**强制协作判定点** | 上 ACT-008 · 下 RULE-003 |

### 4.7 数据存储 STORE

| ID | 名称 | 位置 | 键 / 职责 | 上下游 |
|---|---|---|---|---|
| STORE-001 | 答题日志 | `app.js` 的 `loadLogs`/`addLog` | `pz_logs` · **指纹与抽题的唯一数据源**，纯本地 | 上 ACT-003/010/011 · 下 RULE-005/FLOW-005/PAGE-005 |
| STORE-002 | 训练记录 | `app.js` 的 `addLog`（mode 区分） | `pz_logs` · ARG 与杠精作答 | 上 ACT-010/011 · 下 RULE-005 |
| STORE-003 | 关卡解锁进度 | `solo.js` 的 `onLoad`/`markLevelPassed` | `pz_solo_passed` · 控制 `chip-locked` | 上 FLOW-002 · 下 UI-001 |
| STORE-004 | 对攻房间状态 | `versus-service` 的 `pz_rooms` | 10min TTL · 双人答案 | 上 API-003/005 · 下 API-006 |
| STORE-005 | 本地匿名标识 | `app.js` 的 `fetchOpenid` 降级分支 | `pz_local_id` · 云不可用时兜底 | 上 API-001 · 下 PAGE-002 |
| STORE-006 | 当前会话 | `app.js` 的 `startSolo`/`finishSession` | `pz_session` · 结束后并入 STORE-001 | 上 FLOW-001 · 下 STORE-001 |

### 4.8 规则算法 RULE

| ID | 名称 | 位置 | 职责 | 上下游 |
|---|---|---|---|---|
| RULE-001 | 形式类真值表 | `argue-engine.js` 的 `verifyFormDeduction` | 穷举 P/Q 赋值判有效性 | 上 FLOW-002 · 下 TEST-001 |
| RULE-002 | 单题判定与反馈 | `argue-engine.js` 的 `evaluate`/`buildFeedback` | 比对断点+类型，生成反馈 | 上 ACT-003 · 下 STORE-001+UI-005 |
| RULE-003 | 对攻双重判定 | `versus.js` 的 `settle` | 位置与类型**都对**才算抓到 | 上 API-006 · 下 UI-010 |
| RULE-004 | 15 类谬误定义 | `argue-engine.js` 的 `FALLACIES` | id/名称/分组/形式/原因 | 上 data/ 四题库 · 下 UI-004+RULE-007 |
| RULE-005 | 指纹聚合算法 | `argue-engine.js` 的 `computeFingerprint` | 聚合→贝叶斯平滑→场合敏感度 | 上 STORE-001 · 下 PAGE-003 |
| RULE-006 | 送答案防护 | `tests/e2e.test.js` 第 5b 节 | 扫描禁止「直接取正确答案」 | 上 页面代码 · 下 TEST-003 |
| RULE-007 | ARG 三关判定 | `arg-framework.js` 的 `evaluateARG` | **逐项独立判定，不求整体总分** | 上 ACT-010 · 下 STORE-002 |
| RULE-008 | ARG 模式边界 | `arg-framework.js` 的 `argEnabledFor` | `solo`/`versus` 禁用，`train`/`monthly` 启用 | 上 页面模式 · 下 TEST-003 |
| RULE-009 | 杠精四关筛查 | `troll-screen.js` 的 `screen` | **线性通过制**，第 3 关双分支 | 上 ACT-011/012 · 下 STORE-002+UI-014 |
| RULE-010 | 连续天数计算 | `app.js` 的 `computeStreak` | 允许漏一天；**禁用 `toDateString` 排序** | 上 STORE-001 · 下 UI-015 |
| RULE-011 | 合规过滤 | `compliance.js` 的 `checkText`/`sanitize` | 40+ 禁用词 + `[内部]` 前缀豁免 | 上 所有文案出口 · 下 TEST-002/003 |
| RULE-012 | 欧拉图判定 | `euler-diagram.js` 的 `evaluateEuler` | 蓝点存在即错误【引擎已建，未接入】 | 上 形式组三类 · 下 CAP-008 |
| RULE-013 | 抽样策略 | `train.js` 的 `loadDailyQuestions` | 优先级排序 | 上 STORE-001 · 下 PAGE-004 |

### 4.9 测试校验 TEST

| ID | 名称 | 位置 | 规模 | 覆盖 |
|---|---|---|---|---|
| TEST-001 | 引擎正确性 | `tests/engine.test.js` | 60 项 | 真值表、贝叶斯、指纹、15 维完整性与组间均衡 |
| TEST-002 | 题库校验 | `tools/validate-bank.js` | 76 项 | 规模、禁用词、结构、维度合法、ARG 标注、杠精素材 |
| TEST-003 | 端到端流程 | `tests/e2e.test.js` | 81 项 | 完整旅程、合规红线、送答案回归、基础设施、ARG 边界 |
| TEST-004 | 语法校验 | 命令行内联脚本 | — | 24 个源文件 JS 语法 |

---

## 五、约束清单（不可违反）

> **约束比清单更有价值**：清单漏了你会多做，约束漏了你会破坏已有正确的东西。
> 硬约束必须有强制手段；软约束必须有出处。没有的条目只是愿望。

### 硬约束

| ID | 约束 | 强制手段 |
|---|---|---|
| C-001 | ARG 不得出现在首测/对攻/指纹页 | `RULE-008` + TEST-003 |
| C-002 | 形式类必须用真值表，不得交给 AI 判断 | TEST-001 |
| C-003 | 谬误类型必须由用户作答 | `RULE-006` + TEST-003 |
| C-004 | 分享不得设奖励、不得解锁内容（3.2.1） | TEST-003 正则扫描 |
| C-005 | 首测流程零广告（3.2.2） | TEST-003 |
| C-006 | 不出现人格类型标签（3.2.4） | `RULE-011` + TEST-002 |
| C-007 | 三组题量极差 ≤ 2 | TEST-001 |
| C-008 | 每维题量 ≥ 3（`minSamples` 门槛） | TEST-002 |

### 软约束

| ID | 约束 | 出处与效应量 |
|---|---|---|
| S-001 | 不做进度条 | Yu, Yu & Li (2024) 元分析：唯一被点名为无效的元素 |
| S-002 | 不用答对得积分 | Deci et al. (1999, 128 实验)：d = −0.40 |
| S-003 | 只用正面言语反馈 | 同上：唯一正向外在刺激 d = +0.33 |
| S-004 | 断签不清零 | Lally et al. (2010, N=96)：漏一天不实质影响习惯形成 |
| S-005 | 不做全球排行榜 | Balci et al. (2022, N=190 随机对照)：零效果 |

---

## 六、已知陷阱（不要重新踩）

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| `screen()` 与 `selfCheck()` 共用默认值 | 自检空参数误判为「只给了结论」 | 前者默认全通过，后者缺参数视为未声明 |
| `toDateString()` 排序日期 | `"Oct 10"` 排在 `"Oct 08"` 之前 | 归一化为 `YYYY-MM-DD` 数字键 |
| 把 `question.fallacyKey` 当用户答案 | 用户永远答对，指纹全部失真 | 必须用 `selectedFallacy` |
| 节点位置只写文件名 | 文件变大后定位失效 | 精确到函数名 |

---

## 七、未接入资产

| 资产 | 位置 | 状态 |
|---|---|---|
| 欧拉图引擎 | `utils/euler-diagram.js`（273 行） | 引擎完成，**页面未接入** |
| 金字塔三层结构 | 设计完成 | 未实施（6 种分类全合乎 MECE，需先定唯一答案口径） |
| MECE 第一步 | 设计完成 | 未实施（只取「统一分类标准」，不做「穷尽」） |
| 月测模块 | 边界已定义 | 未实施（`RULE-008` 已预留 monthly 模式） |

---

> **维护提示**：若发现代码与本地图不符，**以代码为准并立即更新地图**。
> 失效的地图比没有地图更危险。
>
> 校验：`node ~/.workbuddy/skills/miniprogram-logic-map/scripts/validate-map.js docs/feature-map.md`