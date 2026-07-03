const puppeteer = require('puppeteer');
const path = require('path');
const outDir = '/Users/alumnoad/.gemini/antigravity/brain/7c3f2e37-fc6d-4b2e-b866-22871ced1da7';
const BASE_URL = 'https://solvai-frontend-879357866699.europe-west1.run.app';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 800 } });
  const page = await browser.newPage();

  try {
    // FIX 3: Verify light mode on landing
    console.log('Verifying Landing Page (FIX 3)');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(outDir, 'live_landing_lightmode.png') });

    // Login or Register
    console.log('Registering user...');
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });
    const email = `test-${Date.now()}@example.com`;
    
    await page.type('input[placeholder="Jane Doe"]', 'Jane Doe');
    await page.type('input[placeholder="you@example.com"]', email);
    await page.type('input[placeholder="Min. 8 characters"]', 'Password123!');
    await page.type('input[placeholder="Repeat password"]', 'Password123!');
    // click submit
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 4000));
    
    // We can go to login and login instead if registration doesn't work, but it should work.
    
    // Let's generate a report to make sure we have data
    console.log('Generating Report to verify Dashboard Chart (FIX 7)');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    const genBtn = await page.$('#gen-report-btn') || await page.$('#gen-report-empty');
    if (genBtn) await page.evaluate(el => el.click(), genBtn);
    await new Promise(r => setTimeout(r, 5000));
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' }); // Reload to see the chart
    await new Promise(r => setTimeout(r, 2000));

    console.log('Taking Dashboard screenshot...');
    await page.screenshot({ path: path.join(outDir, 'live_dashboard_chart.png') });

    // Verify Settings (FIX 4, FIX 5)
    console.log('Verifying Settings Page (FIX 4 & 5)');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(outDir, 'live_settings_security.png') });

    // Verify Reports (FIX 6)
    console.log('Verifying Reports Page (FIX 6)');
    await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(outDir, 'live_reports_badges.png') });
    
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
