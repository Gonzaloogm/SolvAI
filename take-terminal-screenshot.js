const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outDir = '/Users/alumnoad/.gemini/antigravity/brain/3a7b47e0-a743-485a-8446-3b494b913165/scratch';
fs.mkdirSync(outDir, { recursive: true });

const BASE_URL = 'http://localhost:5173';
let API_KEY = process.env.STRIPE_DEMO_TEST_KEY;
const envDemoPath = path.join(__dirname, '.env.demo');
if (!API_KEY && fs.existsSync(envDemoPath)) {
    const envDemo = fs.readFileSync(envDemoPath, 'utf8');
    const match = envDemo.match(/STRIPE_DEMO_TEST_KEY=(.*)/);
    if (match) API_KEY = match[1].trim();
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });
    const email = `test-ws-${Date.now()}@example.com`;
    await page.type('#reg-org', 'WS Org Inc.');
    await page.type('#reg-email', email);
    await page.type('#reg-password', 'Password123!');
    await page.type('#reg-confirm', 'Password123!');
    await page.click('#register-submit');
    await new Promise(r => setTimeout(r, 2000));

    await page.goto(`${BASE_URL}/data-sources`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const connectBtn = await page.$('#connect-new-source-btn') || await page.$('#connect-first-source-btn');
    if (connectBtn) await page.evaluate(el => el.click(), connectBtn);
    await new Promise(r => setTimeout(r, 1000));

    const stripeOpt = await page.$('#connect-stripe');
    if (stripeOpt) await page.evaluate(el => el.click(), stripeOpt);
    await new Promise(r => setTimeout(r, 1000));

    await page.type('#ds-input', API_KEY);
    const submitBtn = await page.$('#connect-stripe-submit');
    if (submitBtn) await page.evaluate(el => el.click(), submitBtn);
    await new Promise(r => setTimeout(r, 3000));

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const genBtn = await page.$('#gen-report-btn') || await page.$('#gen-report-empty');
    if (genBtn) await page.evaluate(el => el.click(), genBtn);
    
    // Wait slightly so the status is still generating
    await new Promise(r => setTimeout(r, 1500));
    
    // Click on the report to view the terminal
    const reportLink = await page.$('.btn-primary.btn-sm') || await page.$('.db-table__row');
    if (reportLink) await page.evaluate(el => el.click(), reportLink);
    
    // Wait for the terminal to render something
    await new Promise(r => setTimeout(r, 5000));
    
    await page.screenshot({ path: path.join(outDir, 'screenshot-terminal-live.png') });
    console.log('Saved terminal screenshot');

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
