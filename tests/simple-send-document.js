const { chromium } = require('playwright');

async function simpleSendDocument() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Navigate to UI...');
    await page.goto('http://localhost:8000/ui');
    await page.waitForSelector('#chatInput', { timeout: 10000 });

    // Login
    console.log('\n🔐 Step 1: Login...');
    await page.fill('#chatInput', 'Login with nirk@comsign.co.il password Comsign1!');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    console.log('✅ Logged in\n');
    await page.waitForTimeout(2000);

    // Use the simplified send document command
    console.log('📧 Step 2: Send document with fields...');
    const command = 'Send a PDF document to gals@comda.co.il from template 1234 with signature, initial, and date fields';

    await page.fill('#chatInput', command);
    await page.click('#sendButton');
    console.log('⏳ Waiting for response (up to 2 minutes)...');

    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 120000 });
    await page.waitForTimeout(1000);

    const response = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('\n✅ Final Response:');
    console.log('='.repeat(80));
    console.log(response);
    console.log('='.repeat(80));

    // Check if it was successful
    if (response.toLowerCase().includes('sent') || response.toLowerCase().includes('success')) {
      console.log('\n🎉 SUCCESS! Document sent to gals@comda.co.il');
    } else if (response.toLowerCase().includes('error') || response.toLowerCase().includes('failed')) {
      console.log('\n❌ FAILED: Document was not sent');
    } else {
      console.log('\n⚠️ UNCLEAR: Response doesn\'t clearly indicate success or failure');
    }

    console.log('\n⏳ Keeping browser open for 20 seconds to review...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'C:/tmp/send-document-error.png', fullPage: true });
    console.log('📸 Screenshot saved to C:/tmp/send-document-error.png');
  } finally {
    await browser.close();
  }
}

simpleSendDocument();
