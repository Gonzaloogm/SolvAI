const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outDir = '/Users/alumnoad/.gemini/antigravity/brain/6f7c6a20-4370-4cb9-8a32-4a5d2161e97f';
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const BASE_URL = 'http://localhost:5173';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 1000 }
  });
  const page = await browser.newPage();

  const takeScreenshot = async (name, clip = null) => {
    const filePath = path.join(outDir, `${name}.png`);
    const opts = { path: filePath, fullPage: !clip };
    if (clip) {
        opts.fullPage = false;
        opts.clip = clip;
    }
    await page.screenshot(opts);
    console.log(`Screenshot saved: ${filePath}`);
    return filePath;
  };

  try {
    // 1. Log in with the previously created account or just do dashboard if session alive.
    // Let's just create a new account again. It's fast and reliable.
    console.log('Navigating to Register page...');
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });
    const email = `test-${Date.now()}@example.com`;
    console.log(`Registering as ${email}...`);
    await page.type('#reg-org', 'Test Org Inc.');
    await page.type('#reg-email', email);
    await page.type('#reg-password', 'Password123!');
    await page.type('#reg-confirm', 'Password123!');
    await page.click('#register-submit');
    await new Promise(r => setTimeout(r, 2000));

    // Dashboard screenshot
    console.log('Taking Dashboard screenshot...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await takeScreenshot('screenshot-dashboard-clean');

    // Generate Report without uploading data? The button says "Generate new report" even if no data, let's see. 
    // Actually, wait! In `take-screenshots2.js` I can skip the Data source if I don't need it. 
    // But the instructions specifically say "click on a completed report". 
    // Wait, the previous test created a report. Let's just use the `.env.demo` key.
    
    const envDemoPath = path.join(__dirname, '.env.demo');
    let API_KEY = process.env.STRIPE_DEMO_TEST_KEY;
    if (!API_KEY && fs.existsSync(envDemoPath)) {
        const envDemo = fs.readFileSync(envDemoPath, 'utf8');
        const match = envDemo.match(/STRIPE_DEMO_TEST_KEY=(.*)/);
        if (match) API_KEY = match[1].trim();
    }
    
    if (API_KEY) {
        console.log('Navigating to Data Sources page...');
        await page.goto(`${BASE_URL}/data-sources`, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));
        await takeScreenshot('screenshot-datasources-clean');

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

        console.log('Generating new report...');
        await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));

        const genBtn = await page.$('#gen-report-btn') || await page.$('#gen-report-empty');
        if (genBtn) await page.evaluate(el => el.click(), genBtn);

        await page.waitForFunction(() => {
          const btn = document.querySelector('#gen-report-btn') || document.querySelector('#gen-report-empty');
          return btn && !btn.disabled;
        }, { timeout: 30000 });
        
        await new Promise(r => setTimeout(r, 2000));

        console.log('Opening report...');
        const reportLink = await page.$('.btn-primary.btn-sm') || await page.$('.db-table__row');
        if (reportLink) await page.evaluate(el => el.click(), reportLink);
        await new Promise(r => setTimeout(r, 3000));
        
        console.log('Taking report screenshots...');
        await page.evaluate(() => window.scrollTo(0, 0));
        await takeScreenshot('screenshot-report-top-clean', { x: 0, y: 0, width: 1280, height: 800 });
        
        const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
        await page.evaluate((h) => window.scrollTo(0, h), scrollHeight);
        await takeScreenshot('screenshot-report-bottom-clean', { x: 0, y: Math.max(0, scrollHeight - 800), width: 1280, height: 800 });
    }

    // Demo Comparison
    console.log('Navigating to Demo Comparison...');
    await page.goto(`${BASE_URL}/demo-comparison`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    // Click AI tab
    console.log('Clicking AI tab...');
    const aiTab = await page.evaluateHandle(() => {
      const tabs = Array.from(document.querySelectorAll('.tabs-list button'));
      return tabs.find(t => t.textContent.includes('Explainable AI'));
    });
    if (aiTab) {
      await aiTab.click();
      await new Promise(r => setTimeout(r, 1000));
    }
    
    await takeScreenshot('screenshot-democomparison-clean');

    console.log('Done!');
  } catch (err) {
    console.error('Error during automation:', err);
  } finally {
    await browser.close();
  }
})();
