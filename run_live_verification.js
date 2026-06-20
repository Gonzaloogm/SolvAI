const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const https = require('https');

const outDir = '/Users/alumnoad/.gemini/antigravity/brain/30266d64-c68b-443c-8705-316f573b9c54';
const BASE_URL = 'https://solvai-frontend-879357866699.europe-west1.run.app';
let API_KEY = process.env.STRIPE_DEMO_TEST_KEY;
const envDemoPath = path.join(__dirname, '.env.demo');
if (!API_KEY && fs.existsSync(envDemoPath)) {
    const envDemo = fs.readFileSync(envDemoPath, 'utf8');
    const match = envDemo.match(/STRIPE_DEMO_TEST_KEY=(.*)/);
    if (match) API_KEY = match[1].trim();
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();

  // Set download behavior
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: outDir,
  });

  try {
    console.log('Navigating to root...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    console.log('Current URL:', page.url());

    console.log('Clicking "Create account"...');
    await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const regLink = links.find(l => l.innerText.includes('Create account'));
        if (regLink) regLink.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    console.log('Current URL after clicking register:', page.url());

    await page.waitForSelector('#reg-org', { timeout: 10000 });
    const email = `test-${Date.now()}@example.com`;
    await page.type('#reg-org', 'Live Test Org');
    await page.type('#reg-email', email);
    await page.type('#reg-password', 'Password123!');
    await page.type('#reg-confirm', 'Password123!');
    await page.click('#register-submit');
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(outDir, 'post-register.png') });
    console.log('Saved post-register.png');

    console.log('Navigating to data-sources...');
    await page.goto(`${BASE_URL}/data-sources`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const connectBtn = await page.waitForSelector('#connect-new-source-btn, #connect-first-source-btn', { visible: true, timeout: 10000 });
    if (connectBtn) await page.evaluate(el => el.click(), connectBtn);

    const stripeOpt = await page.waitForSelector('#connect-stripe', { visible: true, timeout: 10000 });
    if (stripeOpt) await page.evaluate(el => el.click(), stripeOpt);

    await page.waitForSelector('#ds-input', { visible: true, timeout: 10000 });
    await page.type('#ds-input', API_KEY);
    const submitBtn = await page.$('#connect-stripe-submit');
    if (submitBtn) await page.evaluate(el => el.click(), submitBtn);
    await new Promise(r => setTimeout(r, 4000));
    
    console.log('Navigating to home to generate report...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const genBtn = await page.$('#gen-report-btn') || await page.$('#gen-report-empty');
    if (genBtn) await page.evaluate(el => el.click(), genBtn);

    console.log('Waiting for report to finish generating (can take 1-2 mins)...');
    let noQuotaError = true;
    page.on('response', response => {
      if (!response.ok() && response.url().includes('api/reports') && response.status() === 429) {
         noQuotaError = false;
         console.error('ERROR 429: Gemini Quota Exceeded');
      }
    });

    await page.waitForFunction(() => {
      const btn = document.querySelector('#gen-report-btn') || document.querySelector('#gen-report-empty');
      return btn && !btn.disabled;
    }, { timeout: 120000 });
    
    await new Promise(r => setTimeout(r, 2000));

    if (!noQuotaError) {
       console.error("FAILED due to Quota Error");
       return;
    }

    const reportLink = await page.$('.btn-primary.btn-sm') || await page.$('.db-table__row');
    if (reportLink) await page.evaluate(el => el.click(), reportLink);
    await new Promise(r => setTimeout(r, 4000));
    
    console.log('Fetching raw JSON from API...');
    const token = await page.evaluate(() => localStorage.getItem('solvai_token'));
    
    // Wait to ensure we have navigated to the report detail page
    await page.waitForFunction(() => window.location.pathname.includes('/reports/'), { timeout: 10000 });
    
    const currentUrl = page.url();
    console.log('Current page URL for report:', currentUrl);
    
    // Get the report ID from the URL
    const urlParts = currentUrl.split('/');
    const reportId = urlParts[urlParts.length - 1];
    console.log('Extracted Report ID:', reportId);
    
    const apiBase = BASE_URL.replace('solvai-frontend', 'solvai-api');
    console.log('API Base URL:', apiBase);
    
    let reportData = null;
    let attempts = 0;
    while (attempts < 20) {
        const response = await fetch(`${apiBase}/solvency-reports/${reportId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        reportData = await response.json();
        if (reportData.status === 'COMPLETED') {
            break;
        } else if (reportData.status === 'FAILED') {
            console.error('Report generation FAILED');
            break;
        }
        console.log(`Report status is ${reportData.status}, waiting...`);
        await new Promise(r => setTimeout(r, 5000));
        attempts++;
    }
    
    fs.writeFileSync(path.join(outDir, 'live_report.json'), JSON.stringify(reportData, null, 2));
    console.log('Saved JSON to live_report.json');
    
    // Download PDF
    console.log('Downloading PDF...');
    const pdfResponse = await fetch(`${apiBase}/solvency-reports/${reportId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (pdfResponse.ok) {
        const arrayBuffer = await pdfResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(path.join(outDir, 'live_report.pdf'), buffer);
        console.log('Saved PDF to live_report.pdf');
    } else {
        console.error('Failed to download PDF:', pdfResponse.status, pdfResponse.statusText);
        const errText = await pdfResponse.text();
        console.error(errText);
    }
    
    console.log('Verification Script Complete.');

  } catch (err) {
    console.error(err);
    await page.screenshot({ path: path.join(outDir, 'error-screenshot.png') });
    console.log('Saved error screenshot to error-screenshot.png');
  } finally {
    await browser.close();
  }
})();
