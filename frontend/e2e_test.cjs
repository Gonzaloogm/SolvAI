const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // 1. Register a new user
  console.log("Registering user...");
  await page.goto('http://localhost:5173/register');
  await page.waitForSelector('input[type="email"]');
  const email = `test_${Date.now()}@solvai.app`;
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', 'Password123!');
  await page.type('#reg-confirm', 'Password123!');
  await page.type('input[placeholder="Acme Consulting Ltd."]', 'Test Org');
  await page.click('button[type="submit"]');
  
  // Wait for login redirect and dashboard
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  
  // 2. Go to Data Sources
  console.log("Navigating to Data Sources...");
  await page.goto('http://localhost:5173/data-sources');
  await page.waitForSelector('#connect-first-source-btn');
  await page.click('#connect-first-source-btn');
  
  // Select Stripe
  await page.waitForSelector('#connect-stripe');
  await page.click('#connect-stripe');
  
  // Submit Stripe Connect
  await page.waitForSelector('#ds-input');
  const stripeKey = process.env.STRIPE_DEMO_TEST_KEY;
  if (!stripeKey) {
    console.error('ERROR: STRIPE_DEMO_TEST_KEY environment variable is not set.');
    console.error('Set it from .env.demo: export STRIPE_DEMO_TEST_KEY=$(grep STRIPE_DEMO_TEST_KEY .env.demo | cut -d "=" -f2)');
    process.exit(1);
  }
  await page.type('#ds-input', stripeKey);
  await page.waitForSelector('#connect-stripe-submit');
  await page.click('#connect-stripe-submit');
  
  // Wait for connected source
  await page.waitForSelector('.ds-source-item', { timeout: 10000 });
  console.log("Stripe Connected!");
  
  // 3. Go to Dashboard to generate report
  console.log("Navigating to Dashboard...");
  await page.goto('http://localhost:5173/');
  
  // Click Generate New Report
  await page.waitForSelector('button.btn-primary');
  // Evaluate to find the button with text containing "Generate"
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const genBtn = buttons.find(b => b.textContent.includes('Generate'));
    if(genBtn) genBtn.click();
  });
  
  // Wait for report to generate by polling the dashboard
  console.log("Waiting for report to generate...");
  let reportDone = false;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 5000)); // wait 5 seconds
    await page.reload();
    
    // Wait for the report card to finish loading from the API
    try {
      await page.waitForSelector('.db-summary-card__val', { timeout: 4000 });
    } catch(e) {
      // It might still be showing the empty state, that's fine, continue polling
    }
    
    // Check if score is visible (which means report is generated)
    const hasScore = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.db-summary-card__val'));
      return els.some(el => el.textContent.includes('/ 100'));
    });
    
    if (hasScore) {
      reportDone = true;
      break;
    }
  }
  
  if (!reportDone) {
    console.log("Report generation timed out!");
  }
  
  // Click View Report
  await page.click('a.btn-primary.btn-sm');
  
  // Wait for report details page
  console.log("Waiting for report page to load...");
  await page.waitForSelector('.metric-card', { timeout: 10000 });
  
  // Take screenshot
  const screenshotPath = '/Users/alumnoad/.gemini/antigravity/brain/a67b99b2-33ba-4ef3-a3ed-c556016f6b65/report_screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);

  await browser.close();
})();
