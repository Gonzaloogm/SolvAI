const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:5173';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Quick login as existing user from recent test
    // Actually we can't reliably guess the email, we'll register again
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });
    const email = `test-${Date.now()}@example.com`;
    await page.type('#reg-org', 'Test Org Inc.');
    await page.type('#reg-email', email);
    await page.type('#reg-password', 'Password123!');
    await page.type('#reg-confirm', 'Password123!');
    await page.click('#register-submit');
    await new Promise(r => setTimeout(r, 2000));
    
    // We don't need a real API key to generate an empty report, right? 
    // Wait, the button might generate an empty report.
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    const genBtn = await page.$('#gen-report-btn') || await page.$('#gen-report-empty');
    if (genBtn) await page.evaluate(el => el.click(), genBtn);
    await new Promise(r => setTimeout(r, 4000));
    
    const reportLink = await page.$('.btn-primary.btn-sm') || await page.$('.db-table__row');
    if (reportLink) {
        await page.evaluate(el => el.click(), reportLink);
        await new Promise(r => setTimeout(r, 4000));
        const html = await page.evaluate(() => document.body.innerHTML);
        console.log(html.substring(0, 500));
    } else {
        console.log('No report link found');
    }

  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
