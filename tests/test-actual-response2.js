const { chromium } = require('playwright');

async function testActualResponse() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Navigating to UI...');
    await page.goto('http://localhost:8000/ui');
    await page.waitForSelector('#chatInput', { timeout: 10000 });

    console.log('📝 Sending login message...');
    await page.fill('#chatInput', 'Login to WeSign with email nirk@comsign.co.il and password Comsign1!');
    await page.click('#sendButton');

    // Wait for user message
    await page.waitForSelector('.message.user', { timeout: 5000 });
    console.log('✅ User message sent');

    // Wait for assistant response (up to 60 seconds)
    console.log('⏳ Waiting for assistant response...');
    await page.waitForSelector('.message.assistant:not(:has-text("Welcome"))', { timeout: 60000 });

    // Get ALL assistant messages to see what we have
    const allMessages = await page.locator('.message.assistant').all();
    console.log(`\n📊 Found ${allMessages.length} assistant messages\n`);

    for (let i = 0; i < allMessages.length; i++) {
      const textContent = await allMessages[i].textContent();
      const innerText = await allMessages[i].innerText();
      const innerHTML = await allMessages[i].innerHTML();

      console.log(`${'='.repeat(80)}`);
      console.log(`Message ${i + 1} - textContent (length: ${textContent.length}):`);
      console.log(textContent.substring(0, 200));
      console.log(`\nMessage ${i + 1} - innerText (length: ${innerText.length}):`);
      console.log(innerText.substring(0, 500));
      console.log(`\nMessage ${i + 1} - innerHTML (first 300 chars):`);
      console.log(innerHTML.substring(0, 300));
    }

    // Get the LAST message using innerText
    const response = await page.locator('.message.assistant').last().innerText();

    console.log('\n' + '='.repeat(80));
    console.log('📨 FINAL ACTUAL RESPONSE (innerText of last message):');
    console.log('='.repeat(80));
    console.log(response);
    console.log('='.repeat(80));
    console.log('\n📊 Response Analysis:');
    console.log('- Length:', response.length, 'characters');
    console.log('- Contains "Login Successful":', response.includes('Login Successful'));
    console.log('- Contains "Welcome":', response.includes('Welcome'));
    console.log('- Contains "Profile":', response.includes('Profile'));
    console.log('- Contains emojis:', /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(response));
    console.log('- Lowercase includes "login successful":', response.toLowerCase().includes('login successful'));
    console.log('- Lowercase includes "profile":', response.toLowerCase().includes('profile'));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testActualResponse();
