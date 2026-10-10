module.exports = {
  version: '1.0.0',
  note: '周轮换题库 20 道。场景更日常，用于保持新鲜感。防止用户批评"每天就是那几种题重复"。',

  questions: [
    // ============ 肯定后件 2 道 ============
    {
      id: 'r01',
      fallacyKey: 'affirming_consequent',
      difficulty: 2,
      scene: '日常闲聊',
      text: '那家咖啡店排队那么长，说明他们的咖啡肯定特别好喝。',
      cards: [
        { id: 'p1', type: 'premise', text: '该店排队人数多' },
        { id: 'c1', type: 'conclusion', text: '其咖啡品质必然出众' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'affirming_consequent', why: '排队可能是因为位置好、单价低、适合办公打卡，甚至可能是网红效应。用观察到的结果倒推原因，中间跳过了太多别的解释。' },
      groundTruth: '排队可能因为位置、价格、氛围，用它证明咖啡好喝是倒果为因。',
      hint: '他们家还有哪些特点是排队的人会知道的？',
    },
    {
      id: 'r02',
      fallacyKey: 'affirming_consequent',
      difficulty: 3,
      scene: '同事讨论',
      text: '用这个工具的团队交付速度都很快，所以我们也该换成这个工具。',
      cards: [
        { id: 'p1', type: 'premise', text: '采用该工具的团队交付更快' },
        { id: 'c1', type: 'conclusion', text: '本团队应立即更换' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'affirming_consequent', why: '那些团队可能本来就流程清晰、团队小、需求变更少。工具能带来多少提升取决于原有基础，不能从观察到的相关性直接得出更换结论。' },
      groundTruth: '用的人快，不代表换了工具你也会快。',
      hint: '用这个工具的团队，本来就有什么优势？',
    },

    // ============ 否定前件 2 道 ============
    {
      id: 'r03',
      fallacyKey: 'denying_antecedent',
      difficulty: 2,
      scene: '日常判断',
      text: '经常跑步的人几乎不生病。我不跑步，所以身体肯定差。',
      cards: [
        { id: 'p1', type: 'premise', text: '跑步人群的患病率显著更低' },
        { id: 'p2', type: 'premise', text: '本人不参与跑步' },
        { id: 'c1', type: 'conclusion', text: '本人健康状况必然较差' },
      ],
      breakpoint: { from: 'p2', to: 'c1', fallacy: 'denying_antecedent', why: '不跑步的人内部差异很大——有人靠饮食和作息，有人靠医疗条件。不跑步只说明「这项运动带来的这部分收益」拿不到，不等于整体健康差。' },
      groundTruth: '不跑步只是少了一项运动的收益，健康还由很多因素决定。',
      hint: '不跑步的人里，健身的也有吧？',
    },
    {
      id: 'r04',
      fallacyKey: 'denying_antecedent',
      difficulty: 3,
      scene: '学习讨论',
      text: '读完这本书的人写作水平都有提升。所以我如果不读这本书，写作水平就不会提升。',
      cards: [
        { id: 'p1', type: 'premise', text: '读过该书者写作自评普遍更高' },
        { id: 'p2', type: 'premise', text: '本人未读该书' },
        { id: 'c1', type: 'conclusion', text: '写作水平将无法提升' },
      ],
      breakpoint: { from: 'p2', to: 'c1', fallacy: 'denying_antecedent', why: '而且这里还叠加了一个观察问题：读这本书的人本来就是爱读书的人，他们的写作提升可能来自大量其他阅读。不读这一本，别的书也可以读。' },
      groundTruth: '不读这一本，还有别的路径能提升写作。',
      hint: '喜欢读这本书的人，本身就爱看书吧？',
    },

    // ============ 合成谬误 1 道 ============
    {
      id: 'r05',
      fallacyKey: 'composition',
      difficulty: 3,
      scene: '团队协作',
      text: '这个组每个人效率都很高，所以这个组的产出肯定是最高的。',
      cards: [
        { id: 'p1', type: 'premise', text: '组内成员个人效率数据优秀' },
        { id: 'c1', type: 'conclusion', text: '团队整体产出必然最高' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'composition', why: '协作有成本：沟通、等待、对齐。这些成本可能吃掉高效率带来的收益。三个人各自快，加起来不一定快。' },
      groundTruth: '个体效率高，协作成本可能把优势吃掉。',
      hint: '大家都很忙的时候，产出就一定高吗？',
    },

    // ============ 归谬 1 道 ============
    {
      id: 'r06',
      fallacyKey: 'reductio',
      difficulty: 3,
      scene: '日常争论',
      text: '你既然觉得加班没用，那照你的意思，大家每天早点回家，公司就该关门了？',
      cards: [
        { id: 'p1', type: 'premise', text: '对方质疑无效加班的价值' },
        { id: 'c1', type: 'conclusion', text: '公司无法继续运营' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'reductio', why: '「反对无效加班」和「公司关门」之间没有必然联系。真正的归谬要求推出逻辑矛盾，而这里只是把立场推到荒谬。' },
      groundTruth: '质疑无效加班，不等于主张公司无法运营。',
      hint: '不加班和公司关门之间，差多少步？',
    },

    // ============ 诉诸无知 2 道 ============
    {
      id: 'r07',
      fallacyKey: 'appeal_ignorance',
      difficulty: 2,
      scene: '日常决策',
      text: '没人投诉过这个功能的问题，所以这个功能应该没问题。',
      cards: [
        { id: 'p1', type: 'premise', text: '客服未收到该功能相关投诉' },
        { id: 'c1', type: 'conclusion', text: '该功能不存在问题' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'appeal_ignorance', why: '没人投诉可能是因为用户不知道有问题、或者放弃了、或者问题太隐蔽不构成投诉。把「没人说有问题」当成「没问题」，是典型的举证责任倒置。' },
      groundTruth: '没人投诉，可能是没人发现，也可能是发现了没说。',
      hint: '投诉率低，就等于问题少吗？',
    },
    {
      id: 'r08',
      fallacyKey: 'appeal_ignorance',
      difficulty: 3,
      scene: '健康话题',
      text: '我没查到这个保健品有什么副作用记录，那它应该是安全的。',
      cards: [
        { id: 'p1', type: 'premise', text: '公开检索未发现副作用记录' },
        { id: 'c1', type: 'conclusion', text: '该产品是安全的' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'appeal_ignorance', why: '副作用记录本来就常滞后于上市时间。没有记录只能说明研究还没跟上，不能反推安全。安全性需要主动证据，不能靠举证责任倒置。' },
      groundTruth: '没查到副作用记录，是研究没跟上，不是产品安全。',
      hint: '很多问题是产品火了之后才被发现的。',
    },

    // ============ 诉诸权威 2 道 ============
    {
      id: 'r09',
      fallacyKey: 'appeal_authority',
      difficulty: 2,
      scene: '日常闲聊',
      text: '医生说这样吃没问题，那就肯定没问题。',
      cards: [
        { id: 'p1', type: 'premise', text: '一位医生表示该做法无碍' },
        { id: 'c1', type: 'conclusion', text: '该做法对所有人绝对安全' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'appeal_authority', why: '医生的判断通常基于特定人群和特定剂量。而且「医生说没问题」这个转述本身可能有信息损耗——原话可能是「一般情况没问题」。' },
      groundTruth: '专业意见有适用范围，「没问题」往往是有限度的判断。',
      hint: '医生说的原话是什么？有没有加前提？',
    },
    {
      id: 'r10',
      fallacyKey: 'appeal_authority',
      difficulty: 3,
      scene: '投资话题',
      text: '某个著名投资人看好这个赛道，所以我们不该怀疑。',
      cards: [
        { id: 'p1', type: 'premise', text: '一位知名投资人表达看好' },
        { id: 'c1', type: 'conclusion', text: '不应再对该赛道存疑' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'appeal_authority', why: '他的判断基于自己的信息渠道和组合考虑，可能就是投资这件事本身。而且知名意味着曝光多，不意味着判断更准——投资成功率和名气关系不大。' },
      groundTruth: '他看好，可能和他正在投这件事有关。',
      hint: '他看好的这个赛道，和他投的是同一个吗？',
    },

    // ============ 诉诸大众 1 道 ============
    {
      id: 'r11',
      fallacyKey: 'appeal_popularity',
      difficulty: 2,
      scene: '日常消费',
      text: '这个 App 下载量那么高，肯定很好用。',
      cards: [
        { id: 'p1', type: 'premise', text: '该应用下载量排名靠前' },
        { id: 'c1', type: 'conclusion', text: '其用户体验必然优秀' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'appeal_popularity', why: '下载量可能来自预装、推广投放、免费榜单排名。而且下载多和使用体验好是两件事——很多下载量高的应用留存很差。' },
      groundTruth: '下载多可能靠投放，用得爽才靠体验。',
      hint: '下载量高，是因为好用还是因为买量？',
    },

    // ============ 诉诸情感 2 道 ============
    {
      id: 'r12',
      fallacyKey: 'appeal_emotion',
      difficulty: 2,
      scene: '日常决策',
      text: '这个方案讲得太振奋人心了，所以肯定是好方案。',
      cards: [
        { id: 'p1', type: 'premise', text: '方案叙事令人振奋' },
        { id: 'c1', type: 'conclusion', text: '方案在执行上正确' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'appeal_emotion', why: '令人振奋往往是因为表达能力强，而不是方案本身好。越是在信息不充分的时候，人越容易被情绪带动做决定。' },
      groundTruth: '讲得振奋人心和做出来是对的，两件事。',
      hint: '如果这个方案烂但讲得特别好听呢？',
    },
    {
      id: 'r13',
      fallacyKey: 'appeal_emotion',
      difficulty: 3,
      scene: '产品讨论',
      text: '用户都在评论区哭着说要这个功能，所以这个需求必须立刻做。',
      cards: [
        { id: 'p1', type: 'premise', text: '评论区有强烈正向反馈' },
        { id: 'c1', type: 'conclusion', text: '应将其列为最高优先级' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'appeal_emotion', why: '评论区发声的是愿意留言的那部分用户，沉默的大多数不在其中。而且「强烈」不等于「普遍」，更不等于「收益最大」。' },
      groundTruth: '吵得最响的，不一定是受益最多的那批人。',
      hint: '会专门留言的用户，占所有用户多少？',
    },

    // ============ 偷换概念 2 道 ============
    {
      id: 'r14',
      fallacyKey: 'equivocation',
      difficulty: 2,
      scene: '日常沟通',
      text: '我们要把服务做大，所以要多招人。人多了，服务自然就大了。',
      cards: [
        { id: 'p1', type: 'premise', text: '目标是把服务规模做大' },
        { id: 'c1', type: 'conclusion', text: '增加人手即可达成' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'equivocation', why: '「做大」在前提里指提升服务质量或扩大用户价值，结论却偷换成了扩大人员编制。招人多不等于服务好——人均产出可能反而下降。' },
      groundTruth: '想做大服务和想多招人，是两回事。',
      hint: '多招人之后，人均效率会变吗？',
    },
    {
      id: 'r15',
      fallacyKey: 'equivocation',
      difficulty: 3,
      scene: '需求讨论',
      text: '这个功能要快。因为快能提高用户体验。',
      cards: [
        { id: 'p1', type: 'premise', text: '该功能存在体验问题' },
        { id: 'p2', type: 'premise', text: '开发者把「快」理解为响应时间' },
        { id: 'c1', type: 'conclusion', text: '优化响应时间即可解决' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'equivocation', why: '用户体验里的「快」可能是反馈及时、流程清楚、结果可预期，不一定是响应时间。更关键的是，响应慢可能只是表象，根因是流程本身有问题。' },
      groundTruth: '用户说的「慢」和你理解的「慢」，可能不是一件事。',
      hint: '用户抱怨的真的是响应时间吗？',
    },

    // ============ 滑坡谬误 2 道 ============
    {
      id: 'r16',
      fallacyKey: 'slippery_slope',
      difficulty: 2,
      scene: '日常讨论',
      text: '今天允许晚到，明天就会有人不来，然后制度就废了，最后公司连考勤都做不了。',
      cards: [
        { id: 'p1', type: 'premise', text: '存在滥用风险' },
        { id: 'c1', type: 'conclusion', text: '最终考勤制度将完全失效' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'slippery_slope', why: '从「可能有人滥用」到「制度完全失效」之间跳过了整个中间地带——审批机制、弹性工作制、有边界的试运行，都是可选项。' },
      groundTruth: '有滥用风险，可以加审批，不等于制度必然失效。',
      hint: '除了「禁止」和「随便来」，还有别的选项吗？',
    },
    {
      id: 'r17',
      fallacyKey: 'slippery_slope',
      difficulty: 3,
      scene: '技术讨论',
      text: '现在开了内部接口，以后就得对外开放，然后就被人刷，最后系统全挂。',
      cards: [
        { id: 'p1', type: 'premise', text: '当前接口仅内部使用' },
        { id: 'p2', type: 'premise', text: '存在未来开放的可能性' },
        { id: 'c1', type: 'conclusion', text: '系统最终必然被攻击至瘫痪' },
      ],
      breakpoint: { from: 'p2', to: 'c1', fallacy: 'slippery_slope', why: '「存在可能性」被当成「必然发生」处理。而且限流、鉴权、灰度都是中间手段，即使真对外开放也不等于会被刷挂。' },
      groundTruth: '可能开放，不等于会被攻击挂。有很多防护手段。',
      hint: '开放之后有哪些防护手段没被考虑？',
    },

    // ============ 稻草人 1 道 ============
    {
      id: 'r18',
      fallacyKey: 'strawman',
      difficulty: 3,
      scene: '日常争论',
      text: '你说要提高价格门槛，那你就是想把小客户都赶走咯？',
      cards: [
        { id: 'p1', type: 'premise', text: '对方主张提高入门价格' },
        { id: 'c1', type: 'conclusion', text: '对方主张排斥全部小客户' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'strawman', why: '「提高门槛」和「赶走所有小客户」差得很远。可能是筛选更匹配的用户、提升服务质量。而且用「赶走」这种带情绪的词，是典型的稻草人话术。' },
      groundTruth: '提高门槛不等于排斥所有人。',
      hint: '提高门槛之后，小客户一定全都走了吗？',
    },

    // ============ 归因谬误 2 道 ============
    {
      id: 'r19',
      fallacyKey: 'false_cause',
      difficulty: 2,
      scene: '日常观察',
      text: '换了新水杯之后，我今天状态特别好。所以状态好是因为新杯子。',
      cards: [
        { id: 'p1', type: 'premise', text: '更换杯子与状态变好同时发生' },
        { id: 'c1', type: 'conclusion', text: '杯子导致状态变好' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'false_cause', why: '心情可能来自睡眠、天气、吃了什么、有没有烦心事。单一事件和结果同时出现，通常只能说明相关，不能说明因果——尤其这种量级的日常事件。' },
      groundTruth: '同一天发生的巧合，不代表其中一个导致了另一个。',
      hint: '今天早上你睡了几个小时？',
    },
    {
      id: 'r20',
      fallacyKey: 'false_cause',
      difficulty: 3,
      scene: '工作复盘',
      text: '这个月招聘了新人，产出也涨了。所以招聘新人能提高产出。',
      cards: [
        { id: 'p1', type: 'premise', text: '本季度新增人力且产出上升' },
        { id: 'c1', type: 'conclusion', text: '产出上升由招聘导致' },
      ],
      breakpoint: { from: 'p1', to: 'c1', fallacy: 'false_cause', why: '新人是三个月招的，产出是慢慢涨的，时间尺度并不对应。而且同期可能还上了新流程、拿了大客户、需求变多。混杂因素一个都没排除。' },
      groundTruth: '两个指标一起涨，不代表一个是另一个的原因。',
      hint: '招人用了多久？产出的增长节奏对得上吗？',
    },
  ],
};