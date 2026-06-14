const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outDir = '/Users/alumnoad/.gemini/antigravity/brain/6f7c6a20-4370-4cb9-8a32-4a5d2161e97f';
const BASE_URL = 'http://localhost:5173';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();

  const takeScreenshot = async (name) => {
    const filePath = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Screenshot saved: ${filePath}`);
    return filePath;
  };

  try {
    console.log('Navigating to app to take report screenshots...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    // Find the latest completed report
    const reportLink = await page.$('.btn-primary.btn-sm') || await page.$('.db-table__row');
    if (reportLink) {
        console.log('Found report, opening...');
        await page.evaluate(el => el.click(), reportLink);
        await new Promise(r => setTimeout(r, 4000));
        
        await takeScreenshot('screenshot-report-top-clean');
        
        // Scroll down
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 1000));
        await takeScreenshot('screenshot-report-bottom-clean');
        
    } else {
        console.log('No report found!');
    }

    console.log('Done!');
  } catch (err) {
    console.error('Error during automation:', err);
  } finally {
    await browser.close();
  }
})();
