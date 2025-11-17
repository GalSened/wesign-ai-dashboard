const { chromium } = require('playwright');

async function completeSendWorkflow() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Navigate to UI...');
    await page.goto('http://localhost:8000/ui');
    await page.waitForSelector('#chatInput', { timeout: 10000 });

    // Login
    console.log('\n🔐 Login...');
    await page.fill('#chatInput', 'Login to WeSign with nirk@comsign.co.il and Comsign1!');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    console.log('✅ Logged in');

    // Send document using the simple send command with all details
    console.log('\n📧 Sending document from template to gals@comda.co.il...');
    const sendCommand = `Send a document from my first template "1234" to gals@comda.co.il via email.
Before sending, add these signature fields:
- Signature field at x=100, y=700, width=200, height=50 on page 1
- Initial field at x=320, y=700, width=100, height=50 on page 1
- Date field at x=440, y=700, width=150, height=50 on page 1`;

    await page.fill('#chatInput', sendCommand);
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 120000 });

    const response = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('\n✅ Response:');
    console.log('='.repeat(80));
    console.log(response);
    console.log('='.repeat(80));

    console.log('\n🎉 Workflow completed!');
    console.log('⏳ Keeping browser open for 15 seconds to review...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

completeSendWorkflow();
