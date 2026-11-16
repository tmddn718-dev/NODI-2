// 로컬 확인용 단독 HTML 생성: node tools/preview.js [seed]  → shots/preview.html (Chrome으로 열기)
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(R, 'design/Main.dc.html'), 'utf8');
const tpl = html.match(/<x-dc>([\s\S]*)<\/x-dc>/)[1].replace(/assets\/([\w-]+\.svg)/g, (m, f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(R, 'design/assets', f)).toString('base64'));
const code = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const shim = fs.readFileSync(path.join(__dirname, 'dcshim.js'), 'utf8').replace(/<\/script>/g, '<\\/script>');
const props = { view: 'phone', ...(process.argv[2] ? { initialScreen: process.argv[2] } : {}) };
fs.mkdirSync(path.join(R, 'shots'), { recursive: true });
fs.writeFileSync(path.join(R, 'shots/preview.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>NODI 프로토타입</title><style>body{margin:0;background:#EDF1F7;display:flex;justify-content:center;font-family:"Pretendard Variable",Pretendard,"Noto Sans KR",system-ui,sans-serif}</style></head><body><template id="t">${tpl}</template><div id="root"></div><script>${shim}</script><script>dcMount(document.getElementById("t"),${JSON.stringify(code)},${JSON.stringify(props)},document.getElementById("root"))</script></body></html>`);
