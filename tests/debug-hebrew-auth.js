const { chromium } = require('playwright');

async function testHebrewAuth() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Navigating to UI...');
    await page.goto('http://localhost:8000/ui');
    await page.waitForSelector('#chatInput', { timeout: 10000 });

    // Login in Hebrew
    console.log('\n=== Login (Hebrew) ===');
    await page.fill('#chatInput', 'התחבר ל-WeSign עם האימייל nirk@comsign.co.il והסיסמה Comsign1!');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    const loginResponse = await page.locator('.message.assistant[data-status="complete"]').last().innerText();
    console.log('Login response (first 200 chars):', loginResponse.substring(0, 200));

    // Reload and check auth status in Hebrew
    console.log('\n=== Check Auth Status (Hebrew) ===');
    await page.reload();
    await page.waitForSelector('#chatInput', { timeout: 10000 });
    await page.fill('#chatInput', 'בדוק אם אני מחובר ל-WeSign');
    await page.click('#sendButton');
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 90000 });
    const authCheckResponse = await page.locator('.message.assistant[data-status="complete"]').last().innerText();

    console.log('\nFull Hebrew response:');
    console.log('='.repeat(80));
    console.log(authCheckResponse);
    console.log('='.repeat(80));

    console.log('\nSearching for keywords:');
    console.log('Contains "מאומת":', authCheckResponse.includes('מאומת'));
    console.log('Contains "סטטוס":', authCheckResponse.includes('סטטוס'));
    console.log('Contains "מחובר":', authCheckResponse.includes('מחובר'));
    console.log('Contains "אימות":', authCheckResponse.includes('אימות'));
    console.log('Contains lowercase "סטטוס":', authCheckResponse.toLowerCase().includes('סטטוס'));
    console.log('Contains lowercase "מאומת":', authCheckResponse.toLowerCase().includes('מאומת'));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testHebrewAuth();
