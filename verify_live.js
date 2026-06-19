const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outDir = '/Users/alumnoad/.gemini/antigravity/brain/f3d3a44d-c3a8-4d42-8a19-433414af8339';
const BASE_URL = 'https://solvai-frontend-879357866699.europe-west1.run.app';
let API_KEY = process.env.STRIPE_DEMO_TEST_KEY;
const envDemoPath = path.join(__dirname, '.env.demo');
if (!API_KEY && fs.existsSync(envDemoPath)) {
    const envDemo = fs.readFileSync(envDemoPath, 'utf8');
    const match = envDemo.match(/STRIPE_DEMO_TEST_KEY=(.*)/);
    if (match) API_KEY = match[1].trim();
}

async function injectURLBanner(page) {
    await page.evaluate(() => {
        const existing = document.getElementById('url-banner');
        if (existing) existing.remove();
        const banner = document.createElement('div');
        banner.id = 'url-banner';
        banner.style.position = 'fixed';
        banner.style.top = '0';
        banner.style.left = '0';
        banner.style.width = '100%';
        banner.style.backgroundColor = 'yellow';
        banner.style.color = 'black';
        banner.style.zIndex = '999999';
        banner.style.padding = '5px';
        banner.style.fontFamily = 'monospace';
        banner.style.borderBottom = '1px solid black';
        banner.innerText = 'Live URL: ' + window.location.href;
        document.body.prepend(banner);
    });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();

  try {
    page.on('requestfailed', request => {
      console.error(`Request Failed: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });

    page.on('response', response => {
      if (!response.ok() && response.url().includes('api')) {
        console.error(`API Error Response: ${response.request().method()} ${response.url()} [${response.status()}]`);
      }
    });

    page.on('request', request => {
      if (request.url().includes('api')) {
        console.log(`API Request: ${request.method()} ${request.url()}`);
      }
    });

    console.log('Navigating to register...');
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#reg-org', { timeout: 10000 });
    const email = `test-${Date.now()}@example.com`;
    await page.type('#reg-org', 'Live Test Org');
    await page.type('#reg-email', email);
    await page.type('#reg-password', 'Password123!');
    await page.type('#reg-confirm', 'Password123!');
    await injectURLBanner(page);
    await page.screenshot({ path: path.join(outDir, 'screenshot-1-registration.png') });
    console.log('Saved screenshot 1');
    await page.click('#register-submit');
    await new Promise(r => setTimeout(r, 3000));

    console.log('Navigating to data-sources...');
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
    await new Promise(r => setTimeout(r, 4000));
    
    await injectURLBanner(page);
    await page.screenshot({ path: path.join(outDir, 'screenshot-2-connected-sources.png') });
    console.log('Saved screenshot 2');

    console.log('Navigating to home to generate report...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const genBtn = await page.$('#gen-report-btn') || await page.$('#gen-report-empty');
    if (genBtn) await page.evaluate(el => el.click(), genBtn);

    console.log('Waiting for report to finish generating...');
    await page.waitForFunction(() => {
      const btn = document.querySelector('#gen-report-btn') || document.querySelector('#gen-report-empty');
      return btn && !btn.disabled;
    }, { timeout: 60000 });
    
    await new Promise(r => setTimeout(r, 2000));

    const reportLink = await page.$('.btn-primary.btn-sm') || await page.$('.db-table__row');
    if (reportLink) await page.evaluate(el => el.click(), reportLink);
    await new Promise(r => setTimeout(r, 4000));
    
    await injectURLBanner(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(outDir, 'screenshot-3-report.png') });
    console.log('Saved screenshot 3');

    // Get token and fetch API for raw JSON
    console.log('Fetching raw JSON from API...');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    if (token) {
        fs.writeFileSync(path.join(outDir, 'scratch', 'token.txt'), token);
        console.log('Saved token to scratch/token.txt');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
