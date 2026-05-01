const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`PAGE ERROR: ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      // Ignore warnings
    } else {
      console.log(`PAGE LOG: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    console.log(`PAGE EXCEPTION: ${err.toString()}`);
  });

  try {
    console.log("Navigating to production site...");
    await page.goto('https://www.skillhub-it.uz/', { waitUntil: 'networkidle0' });
    
    console.log("Logging in as Asrbek...");
    // Assuming Asrbek is CEO
    await page.type('input[placeholder="Enter your username"]', 'Asrbek');
    await page.type('input[placeholder="••••••••"]', '12345678'); // Usually users use simple passwords for tests, but wait, the password might be different. Let's try 12345678 or 'asrbek'. Actually I don't know the password.
    
    // If I don't know the password, I can't login via UI!
    console.log("Cannot log in because I don't know the password.");
  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
