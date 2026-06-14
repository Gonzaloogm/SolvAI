const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outDir = '/Users/alumnoad/.gemini/antigravity/brain/6f7c6a20-4370-4cb9-8a32-4a5d2161e97f';
const BASE_URL = 'http://localhost:5173';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 1000 }
  });
  const page = await browser.newPage();

  const takeScreenshot = async (name) => {
    const filePath = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Screenshot saved: ${filePath}`);
    return filePath;
  };

  try {
    console.log('Navigating to Demo Comparison...');
    await page.goto(`${BASE_URL}/demo-comparison`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    
    // Click AI tab
    console.log('Clicking AI tab...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.tabs-list button'));
      const ai = tabs.find(t => t.textContent.includes('Explainable AI'));
      if (ai) ai.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    await takeScreenshot('screenshot-democomparison-clean');

    console.log('Done!');
  } catch (err) {
    console.error('Error during automation:', err);
  } finally {
    await browser.close();
  }
})();
