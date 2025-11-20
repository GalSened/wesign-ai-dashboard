const { chromium } = require('playwright');

async function testSendWithRealTemplate() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Navigate to UI...');
    await page.goto('http://localhost:8000/ui');
    await page.waitForSelector('#chatInput', { timeout: 10000 });
    console.log('✅ UI loaded\n');

    // Step 1: Login
    console.log('🔐 Step 1: Login...');
    await page.fill('#chatInput', 'Login with nirk@comsign.co.il password Comsign1!');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    console.log('✅ Logged in\n');
    await page.waitForTimeout(2000);

    // Step 2: List templates to see what's available
    console.log('📋 Step 2: List all templates...');
    await page.fill('#chatInput', 'Show me all my templates');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    await page.waitForTimeout(2000);

    const templatesResponse = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('\n📋 Templates Response:');
    console.log('='.repeat(80));
    console.log(templatesResponse);
    console.log('='.repeat(80));

    // Step 3: Ask user to send from first template
    console.log('\n📧 Step 3: Send document from first available template...');
    const command = 'Send a document from my first template to gals@comda.co.il via email with signature, initial, and date fields';
    
    await page.fill('#chatInput', command);
    await page.click('#sendButton');
    console.log('⏳ Waiting for response (up to 2 minutes)...');

    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 120000 });
    await page.waitForTimeout(2000);

    const finalResponse = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('\n📤 Final Response:');
    console.log('='.repeat(80));
    console.log(finalResponse);
    console.log('='.repeat(80));

    // Analyze the response
    if (finalResponse.toLowerCase().includes('sent') || 
        finalResponse.toLowerCase().includes('success') ||
        finalResponse.toLowerCase().includes('שלח')) {
      console.log('\n✅ SUCCESS! Document appears to have been sent');
    } else if (finalResponse.toLowerCase().includes('error') || 
               finalResponse.toLowerCase().includes('שגיאה') ||
               finalResponse.toLowerCase().includes('failed')) {
      console.log('\n❌ FAILED: Error detected in response');
    } else {
      console.log('\n⚠️ UNCLEAR: Response doesn\'t clearly indicate success or failure');
    }

    console.log('\n⏳ Keeping browser open for 30 seconds to review...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'C:/tmp/send-real-template-error.png', fullPage: true });
    console.log('📸 Screenshot saved to C:/tmp/send-real-template-error.png');
  } finally {
    await browser.close();
  }
}

testSendWithRealTemplate();
