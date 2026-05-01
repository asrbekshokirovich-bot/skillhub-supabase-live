import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[HTTP ${response.status()}] ${response.url()}`);
    }
  });
  
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5173/projects/dbecccd1-975b-47e7-bc27-55aebeb22c5b');
  await page.waitForTimeout(3000);
  
  await browser.close();
})();
