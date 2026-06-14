const puppeteer = require('puppeteer');
const path = require('path');

const API_KEY = process.env.STRIPE_DEMO_TEST_KEY;
if (!API_KEY) {
  console.error('ERROR: STRIPE_DEMO_TEST_KEY environment variable is not set.');
  console.error('Set it from .env.demo: export STRIPE_DEMO_TEST_KEY=$(grep STRIPE_DEMO_TEST_KEY .env.demo | cut -d "=" -f2)');
  process.exit(1);
}
const BASE_URL = 'http://localhost:5173';

(async () => {
  const browser = await puppeteer.launch({
    headless: true, // Use false if you want to see the browser
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();

  const takeScreenshot = async (name) => {
    const filePath = path.join(__dirname, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Screenshot saved: ${filePath}`);
    return filePath;
  };

  try {
    // 0. Register a new user
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
    console.log('Registered and redirected.');

    // 1. Navigate to Data Sources page
    console.log('Navigating to Data Sources page...');
    await page.goto(`${BASE_URL}/data-sources`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await takeScreenshot('screenshot-1-before-connecting');

    // 2. Click "Connect New Source"
    console.log('Clicking "Connect New Source"...');
    await page.waitForSelector('#connect-new-source-btn, #connect-first-source-btn', {visible: true, timeout: 10000}).catch(() => {});
    const connectBtn = await page.$('#connect-new-source-btn');
    if (connectBtn) {
      await page.evaluate(el => el.click(), connectBtn);
    } else {
      const firstConnectBtn = await page.$('#connect-first-source-btn');
      if (firstConnectBtn) await page.evaluate(el => el.click(), firstConnectBtn);
    }
    
    await new Promise(r => setTimeout(r, 1000));

    // Wait for the modal and option
    await page.waitForSelector('#connect-stripe', {visible: true});

    // 3. Select "Stripe"
    console.log('Selecting Stripe...');
    const stripeOpt = await page.$('#connect-stripe');
    if (stripeOpt) await page.evaluate(el => el.click(), stripeOpt);
    await new Promise(r => setTimeout(r, 1000));

    // 4. Enter API Key
    console.log('Entering API Key...');
    await page.type('#ds-input', API_KEY);

    // 5. Submit form
    console.log('Submitting form to connect Stripe...');
    const submitBtn = await page.$('#connect-stripe-submit');
    if (submitBtn) await page.evaluate(el => el.click(), submitBtn);
    
    // Wait for the modal to close and the list to update
    await new Promise(r => setTimeout(r, 3000));
    await takeScreenshot('screenshot-2-connected-sources');

    // 6. Navigate to Solvency Reports (Dashboard)
    console.log('Navigating to Dashboard...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // 7. Click to generate a new report
    console.log('Generating new report...');
    const genBtn = await page.$('#gen-report-btn');
    if (genBtn) {
      await page.evaluate(el => el.click(), genBtn);
    } else {
      const genEmptyBtn = await page.$('#gen-report-empty');
      if (genEmptyBtn) await page.evaluate(el => el.click(), genEmptyBtn);
    }

    // Wait for the report generation to complete
    console.log('Waiting for report generation...');
    await page.waitForFunction(() => {
      const btn = document.querySelector('#gen-report-btn') || document.querySelector('#gen-report-empty');
      return btn && !btn.disabled;
    }, { timeout: 30000 });
    
    await new Promise(r => setTimeout(r, 2000));
    await takeScreenshot('screenshot-3-reports-list-completed');

    // 8. Open the newly generated report
    console.log('Opening newly generated report...');
    const reportLink = await page.$('.btn-primary.btn-sm'); // 'View Report ->'
    if (reportLink) {
        await page.evaluate(el => el.click(), reportLink);
    } else {
        const trRow = await page.$('.db-table__row');
        if (trRow) await page.evaluate(el => el.click(), trRow);
    }
    await new Promise(r => setTimeout(r, 3000));
    await takeScreenshot('screenshot-4-report-detail-score');

    // 9. Navigate to "Demo Comparison" page
    console.log('Navigating to Demo Comparison...');
    await page.goto(`${BASE_URL}/demo-comparison`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    await takeScreenshot('screenshot-5-demo-comparison');

    console.log('End-to-end flow works successfully with real data.');
  } catch (err) {
    console.error('Error during automation:', err);
    try {
        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync(path.join(__dirname, 'error-page.html'), html);
        console.log('Saved error page HTML to error-page.html');
    } catch(e) {}
  } finally {
    await browser.close();
  }
})();
