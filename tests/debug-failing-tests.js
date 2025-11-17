const { chromium } = require('playwright');

async function testResponses() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Navigating to UI...');
    await page.goto('http://localhost:8000/ui');
    await page.waitForSelector('#chatInput', { timeout: 10000 });

    // Test 1: Login (needed for other tests)
    console.log('\n=== TEST 1: Login ===');
    await page.fill('#chatInput', 'Login to WeSign with email nirk@comsign.co.il and password Comsign1!');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    const loginResponse = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('Login response:', loginResponse.substring(0, 200));

    // Test 2: Check auth status (English)
    console.log('\n=== TEST 2: Check Auth Status (EN) ===');
    await page.reload();
    await page.waitForSelector('#chatInput', { timeout: 10000 });
    await page.fill('#chatInput', 'Check if I am logged in to WeSign');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    const authCheckResponse = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('\nFull response:');
    console.log(authCheckResponse);
    console.log('\nExpected words: authenticated, connected, status');
    console.log('Contains "authenticated":', authCheckResponse.toLowerCase().includes('authenticated'));
    console.log('Contains "connected":', authCheckResponse.toLowerCase().includes('connected'));
    console.log('Contains "status":', authCheckResponse.toLowerCase().includes('status'));

    // Test 3: Logout (English)
    console.log('\n=== TEST 3: Logout (EN) ===');
    await page.fill('#chatInput', 'Logout from WeSign');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    const logoutResponse = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('\nFull response:');
    console.log(logoutResponse);
    console.log('\nExpected words: logout, logged out, disconnected');
    console.log('Contains "logout":', logoutResponse.toLowerCase().includes('logout'));
    console.log('Contains "logged out":', logoutResponse.toLowerCase().includes('logged out'));
    console.log('Contains "disconnected":', logoutResponse.toLowerCase().includes('disconnected'));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testResponses();
