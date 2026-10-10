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
   *
   * 实现：用 canvas 本地绘制成图，不依赖云函数——
   * 保证离线可用，且卡片内容完全由本地数据决定。
   */
  onGenerateCard() {
    if (!this.data.enough) {
      wx.showToast({ title: '样本不足，先多闯几关', icon: 'none' });
      return;
    }
    this.drawCard();
  },

  /** canvas 绘制分享卡片 */
  drawCard() {
    const { code, fingerprint, pattern, disclaimer } = this.data;
    const groups = fingerprint.groupList || [];

    const W = 340;
    const cardH = 460;
    const query = wx.createSelectorQuery();

    query.select('#pzCard')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          wx.showToast({ title: '当前环境不支持生成，请用真机', icon: 'none' });
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = W * dpr;
        canvas.height = cardH * dpr;
        ctx.scale(dpr, dpr);

        const C = {
          bg: '#FCFCFA', text: '#1C1C1A', sub: '#5F5E5A',
          weak: '#B4B2A9', faint: '#8B8A85',
          strong: '#0F6E56', warn: '#A32D2D', line: 'rgba(28,28,26,0.12)',
        };

        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, W, cardH);

        let y = 44;

        // 标题
        ctx.fillStyle = C.text;
        ctx.font = '500 19px sans-serif';
        ctx.fillText('我的论证指纹', 28, y);

        // 短代码
        ctx.fillStyle = C.faint;
        ctx.font = '13px monospace';
        ctx.fillText(code || 'PZ-0000', 28, y + 22);

        y += 54;

        // 分隔线
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(28, y);
        ctx.lineTo(W - 28, y);
        ctx.stroke();

        y += 26;

        // 分组表现
        ctx.fillStyle = C.sub;
        ctx.font = '13px sans-serif';
        ctx.fillText('我的表现结构', 28, y);
        y += 20;

        groups.forEach((g) => {
          ctx.fillStyle = C.text;
          ctx.font = '14px sans-serif';
          ctx.fillText(g.name, 28, y + 12);

          // 易犯条
          const barW = 150;
          const x0 = 120;
          ctx.fillStyle = 'rgba(28,28,26,0.08)';
          ctx.fillRect(x0, y + 4, barW, 4);
          ctx.fillStyle = C.warn;
          ctx.fillRect(x0, y + 4, barW * g.fallRate / 100, 4);

          ctx.fillStyle = C.weak;
          ctx.font = '11px sans-serif';
          ctx.fillText('易犯', 282, y + 12);
          ctx.fillStyle = C.warn;
          ctx.font = '12px sans-serif';
          ctx.fillText(g.fallRate + '%', 312, y + 12);

          y += 22;

          // 会抓条
          ctx.fillStyle = 'rgba(28,28,26,0.08)';
          ctx.fillRect(x0, y + 4, barW, 4);
          ctx.fillStyle = C.strong;
          ctx.fillRect(x0, y + 4, barW * g.catchRate / 100, 4);

          ctx.fillStyle = C.weak;
          ctx.font = '11px sans-serif';
          ctx.fillText('能抓', 282, y + 12);
          ctx.fillStyle = C.strong;
          ctx.font = '12px sans-serif';
          ctx.fillText(g.catchRate + '%', 312, y + 12);

          y += 26;
        });

        // 模式描述
        if (pattern) {
          y += 6;
          ctx.fillStyle = C.sub;
          ctx.font = '13px sans-serif';
          ctx.fillText('你的能力结构', 28, y);
          y += 18;

          ctx.fillStyle = C.text;
          ctx.font = '13px sans-serif';
          // 手动换行
          const maxW = W - 56;
          let line = '';
          for (const ch of pattern) {
            if (ctx.measureText(line + ch).width > maxW) {
              ctx.fillText(line, 28, y);
              line = ch;
              y += 20;
            } else {
              line += ch;
            }
          }
          if (line) { ctx.fillText(line, 28, y); y += 20; }
        }

        // 免责声明（合规要求必须展示）
        ctx.fillStyle = C.faint;
        ctx.font = '10px sans-serif';
        ctx.fillText(disclaimer.slice(0, 26), 28, cardH - 26);
        ctx.fillText(disclaimer.slice(26), 28, cardH - 13);

        // 导出
        wx.canvasToTempFilePath({
          canvas,
          success: (tmp) => {
            wx.previewImage({
              urls: [tmp.tempFilePath],
              success: () => {
                wx.showToast({ title: '长按图片保存', icon: 'none' });
              },
            });
          },
          fail: () => {
            wx.setClipboardData({ data: code });
            wx.showToast({ title: '已复制代码 ' + code, icon: 'none' });
          },
        });
      });
  },

  /**
   * 微信转发 —— 这是合规的分享入口
   * 合规要点：不设奖励、不解锁内容、不胁迫（3.2.1）
   */
  onShareAppMessage() {
    const code = this.data.code || 'PZ-0000';
    const top = (this.data.fingerprint.fall || [])[0];
    const scene = this.data.sceneList[0];
    let title = '我测了自己的论证能力，你是什么水平？';
    if (top && scene) {
      title = `我最容易被「${top.name}」带跑（${top.rate}%）。你最容易在什么场合失守？`;
    } else if (top) {
      title = `我最容易被「${top.name}」带跑。你呢？`;
    }
    return {
      title,
      path: `/pages/solo/solo?from=${code}`,
      imageUrl: '/assets/share-cover.png',
    };
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