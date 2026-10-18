/**
 * start-all.js — يشغّل كل حاجة (السيرفر + التطبيق + النفقين) ويضبط الروابط تلقائياً
 * شغّله بـ: node start-all.js
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP = __dirname;
const TOOLS = 'C:/Users/Ahmed/tools';
const CLOUDFLARED = path.join(TOOLS, 'cloudflared.exe');
const ENV_FILE = path.join(APP, '.env');

const children = [];

function log(msg) { console.log(msg); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function start(name, cmd, args, opts = {}) {
  const p = spawn(cmd, args, {
    cwd: opts.cwd || APP,
    shell: !!opts.shell,
    stdio: 'ignore',
    windowsHide: true,
    env: Object.assign({}, process.env, opts.env || {}),
  });
  p.on('error', (e) => log('❌ ' + name + ': ' + e.message));
  children.push({ name, p });
  log('▶️  ' + name);
  return p;
}

async function waitForTunnelUrl(logFile, timeoutMs) {
  const startAt = Date.now();
  while (Date.now() - startAt < (timeoutMs || 90000)) {
    try {
      const txt = fs.readFileSync(logFile, 'utf8');
      const m = txt.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m) return m[0];
    } catch (e) { /* لسه */ }
    await sleep(1500);
  }
  return null;
}

function setEnv(key, value) {
  let env = '';
  try { env = fs.readFileSync(ENV_FILE, 'utf8'); } catch (e) { env = ''; }
  const re = new RegExp('^' + key + '=.*$', 'm');
  const line = key + '=' + value;
  if (re.test(env)) env = env.replace(re, line);
  else env = env.replace(/\s*$/, '') + '\n' + line + '\n';
  fs.writeFileSync(ENV_FILE, env, 'utf8');
}

function isListening(port) {
  try {
    const out = require('child_process').execSync('netstat -ano | findstr :' + port, { encoding: 'utf8' });
    return /LISTENING/.test(out);
  } catch (e) { return false; }
}

(async function main() {
  log('');
  log('================================================');
  log('   تشغيل تطبيق المكتبة');
  log('================================================');
  log('');

  if (!fs.existsSync(CLOUDFLARED)) {
    log('❌ مش لاقي cloudflared في: ' + CLOUDFLARED);
    log('   نزّله من: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe');
    process.exit(1);
  }

  // 1) نفق الـ API (قبل السيرفر عشان نعرف الرابط ونضبط الإعدادات)
  log('[1/5] النفق العام للسيرفر...');
  const apiLog = path.join(TOOLS, 'tunnel-api.log');
  try { fs.unlinkSync(apiLog); } catch (e) {}
  start('API tunnel', CLOUDFLARED, ['tunnel', '--url', 'http://localhost:3000', '--logfile', apiLog]);
  const apiUrl = await waitForTunnelUrl(apiLog, 90000);

  if (!apiUrl) {
    log('❌ مقدرتش أجيب رابط النفق — اطّلع على ' + apiLog);
    process.exit(1);
  }
  log('     ✅ ' + apiUrl);

  // 2) نفق التطبيق
  log('[2/5] النفق العام للتطبيق...');
  const appLog = path.join(TOOLS, 'tunnel-app.log');
  try { fs.unlinkSync(appLog); } catch (e) {}
  start('App tunnel', CLOUDFLARED, ['tunnel', '--url', 'http://localhost:8082', '--logfile', appLog]);
  const appUrl = await waitForTunnelUrl(appLog, 90000);
  if (appUrl) log('     ✅ ' + appUrl);

  // 3) نضبط .env قبل تشغيل أي سيرفر
  log('[3/5] ضبط الإعدادات...');
  setEnv('EXPO_PUBLIC_API_URL', apiUrl);
  setEnv('ALLOWED_ORIGINS', [appUrl, apiUrl, 'http://localhost:8082', 'http://localhost:3000'].filter(Boolean).join(','));
  log('     ✅ اتضبطت');

  // 4) سيرفر لوحة التحكم (بيقرا .env الجديد)
  log('[4/5] سيرفر لوحة التحكم (بورت 3000)...');
  if (isListening(3000)) {
    log('     ⚠️  في سيرفر قديم شغال على 3000 — هوقفه عشان ياخد الإعدادات الجديدة');
    try { require('child_process').execSync('powershell -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', { stdio: 'ignore' }); } catch (e) {}
    await sleep(3000);
  }
  start('API server', 'node', ['admin-server.js']);
  await sleep(6000);

  // 5) سيرفر التطبيق
  log('[5/5] سيرفر التطبيق (بورت 8082)...');
  if (isListening(8082)) {
    log('     ⚠️  في سيرفر قديم شغال على 8082 — هوقفه عشان ياخد الإعدادات الجديدة');
    try { require('child_process').execSync('powershell -Command "Get-NetTCPConnection -LocalPort 8082 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', { stdio: 'ignore' }); } catch (e) {}
    await sleep(3000);
  }
  start('Expo web', 'npx', ['expo', 'start', '--web', '--port', '8082'], { shell: true, env: { BROWSER: 'none' } });

  await sleep(12000);

  log('');
  log('================================================');
  log('   ✅ كل حاجة شغالة!');
  log('================================================');
  log('');
  log('📱 التطبيق من أي مكان:');
  log('   ' + (appUrl || '(شوف ' + appLog + ')'));
  log('');
  log('🛠️  لوحة التحكم من أي مكان:');
  log('   ' + apiUrl);
  log('');
  log('💻 محلياً:');
  log('   http://localhost:8082   (التطبيق)');
  log('   http://localhost:3000   (لوحة التحكم)');
  log('');
  log('⚠️  سيب النافذة دي مفتوحة — لو قفلتها كل حاجة توقف.');
  log('================================================');
  log('');

  // نسيب العملية شغالة (من غير stdin عشان تشتغل في الخلفية)
  setInterval(() => {}, 1 << 30);
})();

process.on('SIGINT', () => {
  log('');
  log('⏹️  بيوقف كل حاجة...');
  children.forEach((c) => { try { c.p.kill(); } catch (e) {} });
  process.exit(0);
});
