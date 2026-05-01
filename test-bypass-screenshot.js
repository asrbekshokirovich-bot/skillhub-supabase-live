import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set localStorage directly to fake a session
  await page.goto('http://localhost:5173');
  await page.evaluate(() => {
    localStorage.setItem('sb-skillhub-auth-token', JSON.stringify({
      user: { id: 'dbecccd1-975b-47e7-bc27-55aebeb22c5b', email: 'test@test.com', role: 'admin' },
      access_token: 'fake',
      refresh_token: 'fake'
    }));
  });
  
  await page.goto('http://localhost:5173/projects/dbecccd1-975b-47e7-bc27-55aebeb22c5b');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-bypass.png' });
  
  await browser.close();
})();
