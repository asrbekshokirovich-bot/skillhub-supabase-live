import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);
  
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  
  await page.goto('http://localhost:5173/projects/dbecccd1-975b-47e7-bc27-55aebeb22c5b');
  await page.waitForTimeout(3000);
  
  const rootHtml = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync('test-loggedin.html', rootHtml);
  
  await browser.close();
})();
