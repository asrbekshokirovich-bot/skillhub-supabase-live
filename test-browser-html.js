import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/projects/dbecccd1-975b-47e7-bc27-55aebeb22c5b');
  await page.waitForTimeout(3000);
  
  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || 'NO ROOT');
  fs.writeFileSync('test-root.html', rootHtml);
  
  await browser.close();
})();
