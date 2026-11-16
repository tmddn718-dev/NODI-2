// Render NODI screens locally (no Claude Design runtime needed) and collect basic QA metrics.
// usage:
//   node tools/shoot.js                      -> all phone screens at 414 into shots/
//   node tools/shoot.js --seeds recs,done    -> only these screens
//   node tools/shoot.js --page               -> full desktop page (prototype + design-system docs)
//   node tools/shoot.js --src design/Main.dc.html --out shots/after
// Each screen writes <seed>.png and <seed>.json ({small: touch targets <44px, smallText: text <13px, hOverflow}).
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.join(__dirname, '..');
const src = opt('--src', path.join(ROOT, 'design/Main.dc.html'));
const outdir = opt('--out', path.join(ROOT, 'shots'));
const W = Number(opt('--width', 414));
const SEEDS = opt('--seeds', 'chat,conds,edit,sheetPick,sheetReq,progress,recs,review,done,meetings,detail,reschedAsk,resched,rsReview,inbox,request,stale').split(',');
const ASSETS = path.join(path.dirname(src), 'assets');
const html = fs.readFileSync(src, 'utf8');
const tpl = html.match(/<x-dc>([\s\S]*)<\/x-dc>/)[1].replace(/assets\/([\w-]+\.svg)/g, (m, f) => {
  try { return 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ASSETS, f)).toString('base64'); } catch (e) { return m; }
});
const code = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const shim = fs.readFileSync(path.join(__dirname, 'dcshim.js'), 'utf8');
fs.mkdirSync(outdir, { recursive: true });

async function open(b, props, w, h, errs, name) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  await p.setContent(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>body{margin:0;background:#EDF1F7;font-family:"Pretendard Variable",Pretendard,"Noto Sans KR",system-ui,sans-serif}</style></head><body><template id="t">${tpl}</template><div id="root"></div><script>${shim}</script></body></html>`);
  await p.evaluate(([code, props]) => dcMount(document.getElementById('t'), code, props, document.getElementById('root')), [code, props]);
  await p.waitForTimeout(700);
  return p;
}

(async () => {
  const b = await chromium.launch(); const errs = [];
  if (args.includes('--page')) {
    const p = await open(b, { view: 'page', skipSplash: true }, 1440, 900, errs, 'page');
    await p.screenshot({ path: path.join(outdir, 'page.png'), fullPage: true }); await p.close();
  } else {
    let small = 0, tiny = 0;
    for (const s of SEEDS) {
      const p = await open(b, { view: 'phone', initialScreen: s }, W, 868, errs, s);
      const m = await p.evaluate(() => {
        const r = []; document.querySelectorAll('button,a,input,[role=button],[role=switch],[role=radio],[role=checkbox],[role=tab]').forEach(e => { const bb = e.getBoundingClientRect(); if (bb.width && bb.height && (bb.height < 44 || bb.width < 44)) r.push({ t: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24), w: Math.round(bb.width), h: Math.round(bb.height) }); });
        const st = []; document.querySelectorAll('*').forEach(e => { if ([...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())) { const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 13) st.push(fs + ':' + e.textContent.trim().slice(0, 20)); } });
        return { small: r, smallText: st, hOverflow: document.documentElement.scrollWidth > innerWidth };
      });
      small += m.small.length; tiny += m.smallText.length;
      fs.writeFileSync(path.join(outdir, s + '.json'), JSON.stringify(m, null, 1));
      await p.screenshot({ path: path.join(outdir, s + '.png') }); await p.close();
    }
    console.log(`screens ${SEEDS.length} · targets<44px ${small} · text<13px ${tiny}`);
  }
  const real = errs.filter(e => !/ERR_|Failed to load resource/.test(e));
  console.log(real.length ? 'errors:\n' + real.join('\n') : 'no runtime errors');
  await b.close();
})();
