// Syntax-check the logic class inside a .dc.html (run after every edit).
// usage: node tools/check-syntax.js [design/Main.dc.html]
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const src = process.argv[2] || path.join(__dirname, '..', 'design/Main.dc.html');
const code = fs.readFileSync(src, 'utf8').match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
const tmp = path.join(os.tmpdir(), 'nodi-check.js');
fs.writeFileSync(tmp, 'const React={createElement(){},createRef(){}};class DCLogic{};\n' + code);
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); console.log('syntax ok'); }
catch (e) { console.error(String(e.stderr)); process.exit(1); }
