import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  await page.goto('http://localhost:5173/projects/dbecccd1-975b-47e7-bc27-55aebeb22c5b');
  
  // wait a bit for react to render
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-screenshot.png' });
  
  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || 'NO ROOT');
  console.log('ROOT HTML LENGTH:', rootHtml.length);
  
  await browser.close();
})();
