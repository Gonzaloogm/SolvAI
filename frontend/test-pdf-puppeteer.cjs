const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('BROWSER CONSOLE:', msg.type(), msg.text());
    for (let i = 0; i < msg.args().length; ++i)
      console.log(`${i}: ${msg.args()[i]}`);
  });
  
  await page.goto('http://localhost:5173/reports');
  
  console.log('Clicking on row menu...');
  await page.waitForSelector('button');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const menuBtn = btns.find(b => b.innerHTML.includes('lucide-more-horizontal'));
    if(menuBtn) menuBtn.click();
  });
  
  console.log('Clicking Download PDF...');
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Download PDF'));
    if(btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
