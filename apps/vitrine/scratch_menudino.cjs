const { chromium } = require('playwright');

async function run() {
  console.log('Launching browser to inspect MenuDino store details page...');
  const bravePath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
  const browser = await chromium.launch({ executablePath: bravePath, headless: true });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();

  console.log('Navigating to https://espankaburguer.menudino.com/...');
  await page.goto('https://espankaburguer.menudino.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click store name "Espanka Burguer"
  console.log('Clicking store title link...');
  const storeLink = page.locator('text=Espanka Burguer').first();
  await storeLink.click();
  await page.waitForTimeout(3000);

  const url = page.url();
  console.log('\n--- STORE DETAILS URL ---', url);

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('\n--- STORE DETAILS BODY TEXT ---');
  console.log(bodyText.slice(0, 3000));

  const screenshotPath = '/Users/mateusvieira/.gemini/antigravity-cli/brain/00f4edbf-df9b-48de-821e-e9d90a707104/scratch/menudino_store_details.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('\n Screenshot saved to:', screenshotPath);

  await browser.close();
}

run().catch(console.error);
