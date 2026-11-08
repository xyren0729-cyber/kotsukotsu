// こつこつ ウィジェット（Scriptable 用）
// iCloud Drive の「Scriptable」フォルダにある、いちばん新しい kotsukotsu-backup-*.json を読んで表示します。
// 表示はバックアップを保存した時点の内容です。

const fm = FileManager.iCloud();
const dir = fm.documentsDirectory();
const files = fm.listContents(dir).filter(f => /^kotsukotsu-backup.*\.json$/.test(f)).sort();

const ym = s => s.slice(0, 7);
const yen = n => '¥' + Math.round(n).toLocaleString('ja-JP');
const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '') + yen(Math.abs(n));
const short = v => v >= 10000 ? (Math.round(v / 1000) / 10).toLocaleString('ja-JP') + '万' : Math.round(v).toLocaleString('ja-JP');
const prevYM = k => { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 2, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const now = new Date();
const curYM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

const w = new ListWidget();
w.backgroundColor = Color.dynamic(new Color('#f6f8f7'), new Color('#0f1513'));
const ink = Color.dynamic(new Color('#14201c'), new Color('#e8efec'));
const sub = Color.dynamic(new Color('#5d6b66'), new Color('#9aa8a2'));
const acc = Color.dynamic(new Color('#1f6f5c'), new Color('#4fbf9f'));
w.url = 'https://xyren0729-cyber.github.io/kotsukotsu/';

if (!files.length) {
  const t = w.addText('こつこつ：バックアップを「Scriptable」フォルダに保存してください');
  t.font = Font.systemFont(12); t.textColor = sub;
} else {
  const path = fm.joinPath(dir, files[files.length - 1]);
  if (!fm.isFileDownloaded(path)) await fm.downloadFileFromiCloud(path);
  const S = JSON.parse(fm.readString(path));
  const tx = S.tx || [], goals = S.goals || [];
  const bal = id => tx.filter(t => t.goalId === id).reduce((a, t) => a + t.amount, 0);
  const current = g => g.kind === 'invest' && g.value != null
    ? g.value + tx.filter(t => t.goalId === g.id && t.date > g.valueDate).reduce((a, t) => a + t.amount, 0)
    : bal(g.id);
  const total = goals.reduce((a, g) => a + current(g), 0);
  const net = k => tx.filter(t => ym(t.date) === k).reduce((a, t) => a + t.amount, 0);
  let k = net(curYM) > 0 ? curYM : prevYM(curYM), st = 0;
  while (net(k) > 0 && st < 120) { st++; k = prevYM(k); }
  const open = goals.filter(g => !g.archived && g.target > 0 && current(g) < g.target)
    .map(g => ({ g, p: current(g) / g.target })).sort((a, b) => b.p - a.p);

  const h = w.addText('こつこつ' + (st >= 2 ? `  🔥${st}` : ''));
  h.font = Font.semiboldSystemFont(12); h.textColor = acc;
  w.addSpacer(4);
  const t = w.addText(yen(total)); t.font = Font.boldSystemFont(22); t.textColor = ink; t.minimumScaleFactor = 0.6;
  const n = w.addText('今月 ' + sgn(net(curYM))); n.font = Font.systemFont(12); n.textColor = sub;
  if (open.length) {
    w.addSpacer(6);
    const o = open[0];
    const g = w.addText(`${o.g.icon || '🎯'} ${o.g.name} ${Math.floor(o.p * 100)}%`); g.font = Font.systemFont(12); g.textColor = ink; g.lineLimit = 1;
    const r = w.addText('あと ' + short(o.g.target - current(o.g)) + '円'); r.font = Font.systemFont(11); r.textColor = sub;
  }
  w.addSpacer();
  const d = w.addText(files[files.length - 1].replace(/^kotsukotsu-backup-|\.json$/g, '') + ' 時点'); d.font = Font.systemFont(9); d.textColor = sub;
}

if (config.runsInWidget) Script.setWidget(w); else await w.presentSmall();
Script.complete();
