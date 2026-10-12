module.exports = {
  "version": "1.0.0",
  "note": "叙事五关·每关 3 题·共 15 题。全部文本已过 compliance.checkText 检查。",
  "levels": [
    {
      "id": 1,
      "name": "老板的季度总结",
      "scene": "季度复盘会",
      "direction": "向外",
      "directionHint": "别人怎么说，你怎么接",
      "difficulty": 1,
      "questions": [
        {
          "id": "s1-01",
          "fallacyKey": "false_cause",
          "text": "这个季度留存率涨了 12%，是因为我们上线了新的召回短信。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "本季度留存率涨了 12%" },
            { "id": "p2", "type": "premise", "text": "同期上线了新的召回短信" },
            { "id": "c1", "type": "conclusion", "text": "留存率上涨是召回短信带来的" }
          ],
          "breakpoint": { "from": "p1", "to": "c1", "fallacy": "false_cause", "why": "两个事件同时发生，可能是巧合，也可能有第三个原因（如同期改了定价策略）。同时发生不等于互为因果。" },
          "groundTruth": "两个变化同时出现，不足以证明存在因果关系。需要排除其他可能来源。",
          "hint": "同一时期还发生了什么？"
        },
        {
          "id": "s1-02",
          "fallacyKey": "appeal_popularity",
          "text": "隔壁团队都用 OKR 了，我们团队不用，是不是就落后了？",
          "cards": [
            { "id": "p1", "type": "premise", "text": "隔壁团队使用 OKR" },
            { "id": "p2", "type": "premise", "text": "其他一些团队也在用" },
            { "id": "c1", "type": "conclusion", "text": "我们不用就会落后" }
          ],
          "breakpoint": { "from": "p2", "to": "c1", "fallacy": "appeal_popularity", "why": "他人普遍选择不构成对本团队的结论。OKR 是否适合本团队，取决于自身目标与协作方式。" },
          "groundTruth": "多数人这么做，和这件事该不该做，是两个问题。",
          "hint": "别的团队用得怎么样，和你们该不该用有关系吗？"
        },
        {
          "id": "s1-03",
          "fallacyKey": "equivocation",
          "text": "我们要提高这个项目的交付效率。效率就是让所有人加班，所以先把打卡制上了。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "目标是提高交付效率" },
            { "id": "p2", "type": "premise", "text": "管理者认为效率等于投入时长" },
            { "id": "c1", "type": "conclusion", "text": "上线打卡制可以提高效率" }
          ],
          "breakpoint": { "from": "p1", "to": "c1", "fallacy": "equivocation", "why": "「交付效率」在这句话里换了含义：前提讲的是单位产出的效率，结论偷换成了工作时长。二者不是一回事。" },
          "groundTruth": "同一个词在推理中途换了含义，结论就跟着偏了。",
          "hint": "「效率」这个词，前后是同一个意思吗？"
        }
      ]
    },
    {
      "id": 2,
      "name": "同事的方案汇报",
      "scene": "方案评审会",
      "direction": "向外",
      "directionHint": "别人怎么说，你怎么接",
      "difficulty": 2,
      "questions": [
        {
          "id": "s2-01",
          "fallacyKey": "composition",
          "text": "我们的三个数据组件都通过了压测，所以整个系统肯定扛得住。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "组件 A 通过压测" },
            { "id": "p2", "type": "premise", "text": "组件 B 通过压测" },
            { "id": "p3", "type": "premise", "text": "组件 C 通过压测" },
            { "id": "c1", "type": "conclusion", "text": "整个系统可以扛住线上流量" }
          ],
          "breakpoint": { "from": "p3", "to": "c1", "fallacy": "composition", "why": "各组件单独通过，不等于组合起来通过。组件之间的相互影响是单独压测测不到的。" },
          "groundTruth": "各部分好，不等于整体好。整体会出现单独测不出的问题。",
          "hint": "组件之间互相影响的部分，压测覆盖到了吗？"
        },
        {
          "id": "s2-02",
          "fallacyKey": "appeal_ignorance",
          "text": "我们没听说过这种风险，所以这个风险应该不存在。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "团队内部无人提及此类风险" },
            { "id": "p2", "type": "premise", "text": "检索内部文档也没有记录" },
            { "id": "c1", "type": "conclusion", "text": "该风险不存在" }
          ],
          "breakpoint": { "from": "p2", "to": "c1", "fallacy": "appeal_ignorance", "why": "没找到证据，只能说明「我们没找到」，不能说明「它不存在」。举证责任在主张它不存在的一方。" },
          "groundTruth": "找不到，和不存在，是两件事。",
          "hint": "你们没搜到，和它不存在，是同一个意思吗？"
        },
        {
          "id": "s2-03",
          "fallacyKey": "affirming_consequent",
          "text": "所有上线这个功能的团队，续费率都超过 40%。所以我们上了这个功能，续费率也会超过 40%。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "部分已上线团队的续费率超过 40%" },
            { "id": "c1", "type": "conclusion", "text": "我们上线后续费率也会超过 40%" }
          ],
          "breakpoint": { "from": "p1", "to": "c1", "fallacy": "affirming_consequent", "why": "看到结果（续费率高）就断定是这个功能带来的。但续费率高的团队可能有其他共同原因，比如用户本身更优质。" },
          "groundTruth": "结果好，不代表是这个原因造成的。可能有别的原因。",
          "hint": "那些续费率高的团队，还有什么是共同点？"
        }
      ]
    },
    {
      "id": 3,
      "name": "销售的客户话术",
      "scene": "客户沟通",
      "direction": "向外",
      "directionHint": "别人怎么说，你怎么接",
      "difficulty": 3,
      "questions": [
        {
          "id": "s3-01",
          "fallacyKey": "slippery_slope",
          "text": "如果我们不做智能客服，客户就会投诉；客户投诉就会影响续约；续约受影响就会导致流失。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "不做智能客服，客户可能投诉" },
            { "id": "p2", "type": "premise", "text": "投诉可能影响续约" },
            { "id": "p3", "type": "premise", "text": "续约受影响可能导致流失" },
            { "id": "c1", "type": "conclusion", "text": "所以必须立刻上线" }
          ],
          "breakpoint": { "from": "p1", "to": "c1", "fallacy": "slippery_slope", "why": "每一步都是「可能」，但整条链被当成了必然。中间任何一环不成立，结论就断了。而且从「流失」直接跳到「必须立刻上线」，中间缺了成本收益比较。" },
          "groundTruth": "一串「可能」串起来，不等于一定会发生。",
          "hint": "这四个词是「一定」还是「可能」？"
        },
        {
          "id": "s3-02",
          "fallacyKey": "appeal_authority",
          "text": "一位行业大佬说过，小团队必须聚焦。所以我们这 50 人的团队，先砍掉 3 条产品线。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "某行业人士提出小团队应聚焦" },
            { "id": "p2", "type": "premise", "text": "本团队规模为 50 人" },
            { "id": "c1", "type": "conclusion", "text": "应砍掉 3 条产品线" }
          ],
          "breakpoint": { "from": "p1", "to": "c1", "fallacy": "appeal_authority", "why": "对方的身份不替代论证。而且从「要聚焦」到「砍掉这 3 条」这一步完全没有依据——该砍哪几条、砍几条，取决于本团队的具体情况。" },
          "groundTruth": "谁说的不影响他说的对不对。而且「聚焦」不等于「砍这三条」。",
          "hint": "他说的话，具体适用于什么情况？"
        },
        {
          "id": "s3-03",
          "fallacyKey": "strawman",
          "text": "你反对扩品类的建议，我就想问一句：你是想让公司什么都做、什么都不聚焦吗？",
          "cards": [
            { "id": "p1", "type": "premise", "text": "对方反对本期扩品类" },
            { "id": "c1", "type": "conclusion", "text": "对方主张什么都做" }
          ],
          "breakpoint": { "from": "p1", "to": "c1", "fallacy": "strawman", "why": "把「反对这一期扩品类」改写成了「主张什么都做」。被反驳的不是对方真正的观点，而是被扭曲的版本。" },
          "groundTruth": "对方说的是这一期不要扩，不是永远什么都做。",
          "hint": "对方说的「反对」，范围到底有多大？"
        }
      ]
    },
    {
      "id": 4,
      "name": "老板的危机决策",
      "scene": "紧急会议",
      "direction": "向上",
      "directionHint": "谁在推这个结论，凭什么",
      "difficulty": 4,
      "questions": [
        {
          "id": "s4-01",
          "fallacyKey": "reductio",
          "text": "如果你不同意用这个方案，那按你的逻辑，公司就别做任何决定了。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "你不认同当前方案" },
            { "id": "c1", "type": "conclusion", "text": "公司不应做任何决策" }
          ],
          "breakpoint": { "from": "p1", "to": "c1", "fallacy": "reductio", "why": "这是把对方的观点推到荒谬结论再反驳，但推的过程没有真正推出矛盾。「不同意这一个方案」和「什么都不做」之间，差着很多其他可能性。" },
          "groundTruth": "反驳要靠真正的矛盾，不是把对方的话推得更极端。",
          "hint": "「不同意这一个方案」和「什么都不做」之间，差多少可能性？"
        },
        {
          "id": "s4-02",
          "fallacyKey": "denying_antecedent",
          "text": "所有通过这个认证的企业都没出问题。隔壁那家企业没过认证就出事了，所以过认证能避免问题。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "过认证的企业中未观察到问题" },
            { "id": "p2", "type": "premise", "text": "某未过认证企业出了问题" },
            { "id": "c1", "type": "conclusion", "text": "过认证可以避免这类问题" }
          ],
          "breakpoint": { "from": "p2", "to": "c1", "fallacy": "denying_antecedent", "why": "从「没通过 → 出了问题」反推「通过 → 不会出问题」。但没通过认证的企业出问题，可能有别的原因（规模、人员、抗压能力等）。" },
          "groundTruth": "反过来不成立。没通过就出问题，不能说明通过了就没问题。",
          "hint": "那家企业出问题，可能和认证无关。"
        },
        {
          "id": "s4-03",
          "fallacyKey": "appeal_emotion",
          "text": "这个方案会让大家很兴奋，所以它一定是对的。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "方案让团队兴奋" },
            { "id": "c1", "type": "conclusion", "text": "方案在决策上正确" }
          ],
          "breakpoint": { "from": "p1", "to": "c1", "fallacy": "appeal_emotion", "why": "团队兴奋说明沟通做得不错，不说明决策正确。情绪的强度和方案的正确性是两个独立维度。" },
          "groundTruth": "让人兴奋的东西经常是错的，让人紧张的也经常是对的。",
          "hint": "兴奋能证明什么？"
        }
      ]
    },
    {
      "id": 5,
      "name": "行业新闻报道",
      "scene": "行业分析",
      "direction": "向内",
      "directionHint": "你自己是怎么想的",
      "difficulty": 5,
      "questions": [
        {
          "id": "s5-01",
          "fallacyKey": "false_cause",
          "text": "自从上了这个系统，销售额涨了 30%。所以这个系统很有效。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "系统上线后销售额上涨 30%" },
            { "id": "p2", "type": "premise", "text": "上线与销售增长在时间上重合" },
            { "id": "c1", "type": "conclusion", "text": "销售增长由该系统导致" }
          ],
          "breakpoint": { "from": "p1", "to": "c1", "fallacy": "false_cause", "why": "时间重合不等于因果。同期的季节性、渠道变化、促销、价格调整都可能是真实原因。要证明因果，需要排除这些。" },
          "groundTruth": "时间上是先后，不代表一个是另一个的原因。",
          "hint": "同期还改了别的什么吗？"
        },
        {
          "id": "s5-02",
          "fallacyKey": "affirming_consequent",
          "text": "用了这个框架的团队，代码缺陷率都低于 3%。我们用了，缺陷率也会低于 3%。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "已使用该框架的团队缺陷率均低于 3%" },
            { "id": "c1", "type": "conclusion", "text": "本团队使用后缺陷率也将低于 3%" }
          ],
          "breakpoint": { "from": "p1", "to": "c1", "fallacy": "affirming_consequent", "why": "从结果好倒推原因是这个框架。但那些团队本身可能有更严格的测试流程或更资深的工程师。" },
          "groundTruth": "用了之后结果好，不一定是这个带来的。",
          "hint": "那些团队还有什么共同点？"
        },
        {
          "id": "s5-03",
          "fallacyKey": "slippery_slope",
          "text": "现在只是 AI 辅助写代码，等以后就是 AI 自己写、AI 自己测试、AI 自己上线。人类的判断力会一步步退化，最后完全消失。",
          "cards": [
            { "id": "p1", "type": "premise", "text": "当前 AI 仅辅助编码" },
            { "id": "p2", "type": "premise", "text": "推测未来自动化程度提高" },
            { "id": "c1", "type": "conclusion", "text": "人类判断力将完全消失" }
          ],
          "breakpoint": { "from": "p2", "to": "c1", "fallacy": "slippery_slope", "why": "从「AI 参与更多」滑向「人类判断力消失」，中间每一步都没有证据。技术能力的增强不等于人的能力必然丧失。" },
          "groundTruth": "从当前状态滑到最坏结果，中间每一步都需要证据。",
          "hint": "从第一步到最后一步，中间有几步是有证据的？"
        }
      ]
    }
  ]
};