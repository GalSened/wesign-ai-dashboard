const { chromium } = require('playwright');

async function testTemplateIdExtraction() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Navigate to UI...');
    await page.goto('http://localhost:8000/ui');
    await page.waitForSelector('#chatInput', { timeout: 10000 });
    console.log('✅ UI loaded\n');

    // Step 1: Login
    console.log('🔐 Step 1: Login to WeSign...');
    await page.fill('#chatInput', 'Login with nirk@comsign.co.il password Comsign1!');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    console.log('✅ Logged in\n');
    await page.waitForTimeout(2000);

    // Step 2: List templates (this should extract and store template IDs)
    console.log('📋 Step 2: List templates to extract IDs...');
    await page.fill('#chatInput', 'Show me my templates');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    await page.waitForTimeout(2000);

    const templatesResponse = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('📋 Templates listed (first 200 chars):', templatesResponse.substring(0, 200), '...\n');

    // Step 3: Send document using template NAME (should be replaced with ID)
    console.log('📧 Step 3: Send document using template "1234" (by name)...');
    const command = 'Send a document from template 1234 to gals@comda.co.il via email with signature, initial, and date fields';

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
      console.log('📋 This might be expected if template "1234" is just a name, not a real template');
    } else {
      console.log('\n⚠️ UNCLEAR: Response doesn\'t clearly indicate success or failure');
    }

    console.log('\n⏳ Keeping browser open for 20 seconds to review...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'C:/tmp/template-id-test-error.png', fullPage: true });
    console.log('📸 Screenshot saved to C:/tmp/template-id-test-error.png');
  } finally {
    await browser.close();
  }
}

testTemplateIdExtraction();
