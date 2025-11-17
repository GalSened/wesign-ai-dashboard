const { chromium } = require('playwright');

async function sendDocumentFromTemplate() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Step 1: Navigate to WeSign AI Assistant UI...');
    await page.goto('http://localhost:8000/ui');
    await page.waitForSelector('#chatInput', { timeout: 10000 });
    console.log('✅ UI loaded successfully\n');

    // Step 1: Login
    console.log('🔐 Step 2: Login to WeSign...');
    await page.fill('#chatInput', 'Login to WeSign with email nirk@comsign.co.il and password Comsign1!');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    let response = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('✅ Login response:', response.substring(0, 150), '...\n');

    // Step 2: List templates
    console.log('📋 Step 3: List available templates...');
    await page.fill('#chatInput', 'Show me my templates list');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    response = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('📋 Templates response:');
    console.log(response);
    console.log('\n');

    // Step 3: Create document from first template with 3 field types
    console.log('📄 Step 4: Create document from template with 3 signature fields...');
    const createMessage = `Create a document from my first template and add these signature fields:
1. A signature field at position x=100, y=700, width=200, height=50 on page 1
2. An initial field at position x=320, y=700, width=100, height=50 on page 1
3. A date field at position x=440, y=700, width=150, height=50 on page 1`;

    await page.fill('#chatInput', createMessage);
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    response = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('✅ Document creation response:');
    console.log(response);
    console.log('\n');

    // Step 4: Send document to gals@comda.co.il
    console.log('📧 Step 5: Send document to gals@comda.co.il...');
    await page.fill('#chatInput', 'Send this document to gals@comda.co.il via email');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    response = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('✅ Send document response:');
    console.log(response);
    console.log('\n');

    console.log('🎉 Workflow completed successfully!');
    console.log('📧 Document sent to gals@comda.co.il');

    // Keep browser open for 10 seconds so user can see the result
    console.log('\n⏳ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await browser.close();
  }
}

sendDocumentFromTemplate();
