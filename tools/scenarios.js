// Click/typing scenarios against the prototype (local shim, Playwright).
// usage: node tools/scenarios.js [design/Main.dc.html]
// A: guided flow (디자인 리뷰 → 다음 주 → 60분 → 조건 카드 → 참석자 시트)
// extraction rules: ready / needs_clarification / unsupported / failed
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const src = process.argv[2] || path.join(__dirname, '..', 'design/Main.dc.html');
const html = fs.readFileSync(src, 'utf8');
const tpl = html.match(/<x-dc>([\s\S]*)<\/x-dc>/)[1];
const code = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const shim = fs.readFileSync(path.join(__dirname, 'dcshim.js'), 'utf8');
const cases = [
  ['ready', '다음 주 화요일 오후에 디자인팀 3명이랑 1시간 리뷰 미팅 잡아줘', []],
  ['모호한 날짜', '다음 주 초에 회고', ['다음 주 월–화', '60분']],
  ['날짜 누락+모호 시간', '오후쯤 30분 싱크', ['다음 주', '오후']],
  ['unsupported', '회의 취소해줘', []],
  ['failed', 'ㅋㅋ', []],
  ['내일', '내일 30분', []],
];
let pass = 0, fail = 0;
const ok = (c, msg) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ ') + msg); };
(async () => {
  const b = await chromium.launch();
  const mk = async () => {
    const p = await b.newPage({ viewport: { width: 414, height: 868 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.setContent(`<!doctype html><html><body style="margin:0"><template id="t">${tpl}</template><div id="root"></div><script>${shim}</script></body></html>`);
    await p.evaluate(([c]) => dcMount(document.getElementById('t'), c, { view: 'phone', skipSplash: true }, document.getElementById('root')), [code]);
    await p.waitForTimeout(300); return { p, errs };
  };
  const text = p => p.evaluate(() => document.getElementById('root').innerText);
  const tap = async (p, t) => { await p.click(`button:has-text("${t}")`); await p.waitForTimeout(900); };

  console.log('== 시나리오 A: 선택형 흐름');
  { const { p, errs } = await mk();
    await tap(p, '디자인 리뷰'); await tap(p, '다음 주'); await tap(p, '60분');
    const t = await text(p);
    ok(/회의 조건을 확인해 주세요/.test(t), '조건 확인 카드가 나타남');
    ok(!/받은 요청/.test(t), '생성 흐름 중 하단 탭 숨김');
    await tap(p, '참석자 선택하기');
    ok(/참석자 선택/.test(await text(p)), '참석자 선택 시트 열림');
    ok(!errs.length, '런타임 오류 없음'); await p.close(); }

  console.log('== 추출 규칙');
  for (const [name, input, taps] of cases) {
    const { p, errs } = await mk();
    await p.evaluate(t => window.__inst.send(t), input); await p.waitForTimeout(1200);
    for (const t of taps) await tap(p, t);
    const t = await text(p), card = /회의 조건을 확인해 주세요/.test(t);
    if (name === 'unsupported') ok(/새 회의의 조건을 정리하는 일만/.test(t) && !card, `${name}: 범위 안내 + 선택지 복구`);
    else if (name === 'failed') ok(/정리하지 못했어요/.test(t) && !card, `${name}: 오류 안내 + 선택지 복구`);
    else ok(card, `${name}: 조건 카드까지 도달 (${input})`);
    if (name === '모호한 날짜') ok(/라고 하셨는데/.test(t), '모호한 날짜를 확정하지 않고 되물음');
    if (name === 'ready') ok(/디자인팀 3명/.test(t) && /미정/.test(t), '참석자는 힌트로만 두고 확정하지 않음');
    if (name === '내일') ok(/11월 17일/.test(t), '내일 = 11월 17일 (기준일 11월 16일)');
    ok(!errs.length, `${name}: 런타임 오류 없음`); await p.close();
  }
  console.log(`\n${pass} passed · ${fail} failed`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
