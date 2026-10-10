/** 论证指纹页 — 裂变核心
 *
 * 合规要求（验收标准 ①）：
 *   - 不含人格类型标签，只有能力倾向排序
 *   - 样本不足时不显示百分比
 *   - 必须展示免责声明
 *   - 分享按钮为用户自愿，不解锁任何内容
 */

const app = getApp();
const compliance = require('../../utils/compliance.js');

Page({
  data: {
    fingerprint: null,
    disclaimer: '',
    code: null,
    pattern: '',
    enough: false,
    sceneList: [],
    sampleNote: '',
  },

  onLoad(query) {
    this.setData({ disclaimer: compliance.DISCLAIMER });
    this.loadFingerprint();
  },

  onShow() {
    this.loadFingerprint();
  },

  loadFingerprint() {
    const fp = app.getFingerprint();
    const enough = fp.complete && fp.sampleSufficient;

    // 所有展示文本过合规过滤
    const sceneList = (fp.situational || []).map(s => ({
      scene: s.scene,
      rate: s.rate,
    }));

    this.setData({
      // 主榜：分组聚合（首测即可出结果）
      groupList: (fp.groups || []).map(g => ({
        name: g.name,
        desc: g.desc,
        fallRate: g.fallRate,
        catchRate: g.catchRate,
        total: g.total,
        confidence: g.confidence,
      })),
      // 副榜：单维（样本足够时出现）
      fall: (fp.fall || []).map(x => ({
        name: x.name, rate: x.rate, total: x.total,
      })),
      catch: (fp.catch || []).map(x => ({
        name: x.name, rate: x.rate, total: x.total,
      })),
      totalAnswers: fp.totalAnswers,
      levelsDone: fp.levelsDone,
      code: fp.code,
      pattern: compliance.sanitize(fp.pattern || ''),
      enough,
      sceneList,
      sampleNote: enough
        ? ''
        : '样本还不够，多闯几关结果会更准。',
    });
  },

  /**
   * 生成卡片（用户自愿行为，不解锁任何内容）
   * 合规注释：分享为自愿，且不带来任何功能增益
   */
  onGenerateCard() {
    if (!this.data.enough) {
      wx.showToast({ title: '样本不足，先多闯几关', icon: 'none' });
      return;
    }
    // 云函数生成卡片图，失败降级为本地提示
    wx.showLoading({ title: '生成中' });
    wx.cloud.callFunction({
      name: 'generate-card',
      data: {
        code: this.data.code,
        fall: this.data.fingerprint.fall,
        catchList: this.data.fingerprint.catch,
        pattern: this.data.pattern,
      },
    }).then((res) => {
      wx.hideLoading();
      if (res.result && res.result.tempFilePath) {
        wx.previewImage({
          urls: [res.result.tempFilePath],
          success: () => wx.saveImageToPhotosAlbum({ filePath: res.result.tempFilePath }),
        });
      }
    }).catch(() => {
      wx.hideLoading();
      // 降级：复制短代码文本，不阻断
      wx.setClipboardData({ data: this.data.code });
      wx.showToast({ title: '已复制代码 ' + this.data.code, icon: 'none' });
    });
  },

  /** 发起对攻 */
  onVersus() {
    if (!this.data.enough) {
      wx.showToast({ title: '样本不足，先多闯几关', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/versus/versus?code=${this.data.code}` });
  },

  /** 进入训练层 */
  onTrain() {
    wx.switchTab({ url: '/pages/train/train' });
  },
});