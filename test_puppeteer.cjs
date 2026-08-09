const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage', '--single-process']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  console.log("TITLE:", await page.title());
  await page.screenshot({ path: 'hero_desktop.png' });
  
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: 'hero_mobile.png' });

  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle2' });
  const buttons = await page.$$('button, a');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('invité')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 2000));
  console.log("DASHBOARD URL:", page.url());
  await page.screenshot({ path: 'dashboard.png' });

  const projectLinks = await page.$$('a[href*="/projects/"]');
  console.log("PROJECT LINKS COUNT:", projectLinks.length);
  if (projectLinks.length > 0) {
    await projectLinks[0].click();
    await new Promise(r => setTimeout(r, 2000));
    console.log("PROJECT DETAIL URL:", page.url());
    await page.screenshot({ path: 'project_detail.png' });
  } else {
    console.log("NO PROJECT FOUND");
  }

  await browser.close();
})();
