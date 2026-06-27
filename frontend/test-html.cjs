const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  await page.goto('http://localhost:5174/test.html');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
  process.exit(0);
})();
