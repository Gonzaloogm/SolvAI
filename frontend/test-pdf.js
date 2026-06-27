import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  await page.goto('http://localhost:5173/reports');
  
  console.log('Clicking on row menu...');
  // Click first row's 3-dot menu
  await page.locator('button:has(svg.lucide-more-horizontal)').first().click();
  
  console.log('Clicking Download PDF...');
  // Click Download PDF
  await page.locator('button:has-text("Download PDF")').click();
  
  await page.waitForTimeout(5000);
  await browser.close();
})();
