const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname;
const mode = process.argv[2] || 'preview';
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.statusCode = 404; return res.end(); }
    const ext = path.extname(p); res.setHeader('Content-Type', {'.html':'text/html','.json':'application/json','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg'}[ext] || 'application/octet-stream'); res.end(d); });
}).listen(8765);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', m => console.log('console:', m.text()));
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto('http://localhost:8765/video.html');
  await page.evaluate(() => window.ready);
  if (mode === 'preview') {
    fs.mkdirSync('preview', { recursive: true });
    const ts = (process.argv[3] || '2,5.5,12,14.5,18,23,27,31,35,39,43,47,51,57').split(',').map(Number);
    for (const t of ts) { await page.evaluate(t => window.render(t), t); await page.screenshot({ path: `preview/t${t}.jpg`, quality: 80, type: 'jpeg' }); }
  } else {
    const fps = 30, dur = 45.0; fs.mkdirSync('frames', { recursive: true });
    const n = Math.round(fps * dur);
    for (let i = 0; i < n; i++) {
      await page.evaluate(t => window.render(t), i / fps);
      await page.screenshot({ path: `frames/f${String(i).padStart(5, '0')}.jpg`, quality: 92, type: 'jpeg' });
      if (i % 150 === 0) console.log('frame', i, '/', n);
    }
  }
  await browser.close(); server.close();
})();
