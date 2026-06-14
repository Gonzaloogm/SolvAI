const puppeteer = require('puppeteer');
const path = require('path');

const outDir = '/Users/alumnoad/.gemini/antigravity/brain/6f7c6a20-4370-4cb9-8a32-4a5d2161e97f';
const BASE_URL = 'http://localhost:5173';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 800 }
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
    console.log('Navigating to App...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('Logging in...');
    await page.type('#login-email, input[type="email"]', 'test-1718374825983@example.com');
    await page.type('#login-password, input[type="password"]', 'Password123!');
    const submitBtn = await page.$('#login-submit, button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await new Promise(r => setTimeout(r, 3000));
    
    const url = page.url();
    console.log('Current URL:', url);
    if (url.includes('/login')) {
       console.log('Login failed? Let us check what is on the page.');
       console.log(await page.content());
    } else {
       console.log('Login successful!');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
