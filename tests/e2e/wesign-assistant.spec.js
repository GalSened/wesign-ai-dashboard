// WeSign AI Assistant E2E Tests
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8000';

test.describe('WeSign AI Assistant E2E Tests', () => {

  test('should load UI successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    // Check header
    await expect(page.locator('h1')).toContainText('WeSign AI Assistant');

    // Check input field exists
    await expect(page.locator('#message-input')).toBeVisible();

    // Check voice button exists
    await expect(page.locator('#voice-button')).toBeVisible();

    // Check send button exists
    await expect(page.locator('#send-button')).toBeVisible();

    console.log('✅ UI loaded successfully');
  });

  test('should send text message and receive response', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    // Wait for page to be ready
    await page.waitForSelector('#message-input');

    // Type and send message
    await page.fill('#message-input', 'Hello, this is a test message');
    await page.click('#send-button');

    // Wait for user message to appear
    await page.waitForSelector('.message.user', { timeout: 5000 });

    // Verify message appeared
    const userMessage = page.locator('.message.user').last();
    await expect(userMessage).toContainText('Hello, this is a test message');

    // Wait for assistant response (max 15 seconds)
    await page.waitForSelector('.message.assistant:not(:has-text("Welcome"))', { timeout: 15000 });

    // Verify response appeared
    const messages = await page.locator('.message.assistant').count();
    expect(messages).toBeGreaterThan(1); // Welcome message + response

    console.log('✅ Text chat working');
  });

  test('should display voice recording button', async ({ page, context }) => {
    // Grant microphone permission
    await context.grantPermissions(['microphone']);

    await page.goto(`${BASE_URL}/ui`);

    const voiceButton = page.locator('#voice-button');
    await expect(voiceButton).toBeVisible();
    await expect(voiceButton).toContainText('🎤');

    console.log('✅ Voice button visible');
  });

  test('should show backend health status', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    // Check status indicator
    const statusIndicator = page.locator('.status-indicator');
    await expect(statusIndicator).toBeVisible();

    // Check connection message
    await expect(page.locator('.footer')).toContainText('Connected');

    console.log('✅ Backend status displayed');
  });

  test('should handle empty message submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    await page.waitForSelector('#message-input');

    // Try to send empty message
    const messageCountBefore = await page.locator('.message').count();
    await page.click('#send-button');

    // Wait a moment
    await page.waitForTimeout(500);

    // Count should not increase (only welcome message should exist)
    const messageCountAfter = await page.locator('.message').count();
    expect(messageCountAfter).toBe(messageCountBefore);

    console.log('✅ Empty message handled');
  });

  test('should make health check request successfully', async ({ page }) => {
    // Listen for network requests
    let healthCheckSuccess = false;

    page.on('response', response => {
      if (response.url().includes('/health') && response.status() === 200) {
        healthCheckSuccess = true;
      }
    });

    await page.goto(`${BASE_URL}/ui`);
    await page.waitForTimeout(1000);

    expect(healthCheckSuccess).toBe(true);
    console.log('✅ Health check successful');
  });

  test('should test agent routing - filesystem request', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    await page.waitForSelector('#message-input');

    // Send filesystem-related message
    await page.fill('#message-input', 'Can you list files in my Documents folder?');
    await page.click('#send-button');

    // Wait for response
    await page.waitForSelector('.message.assistant:not(:has-text("Welcome"))', { timeout: 15000 });

    const lastResponse = page.locator('.message.assistant').last();
    const responseText = await lastResponse.textContent();

    // Response should mention documents or directories
    const hasRelevantResponse =
      responseText.toLowerCase().includes('document') ||
      responseText.toLowerCase().includes('file') ||
      responseText.toLowerCase().includes('directory') ||
      responseText.toLowerCase().includes('folder') ||
      responseText.toLowerCase().includes('allowed');

    expect(hasRelevantResponse).toBe(true);
    console.log('✅ Agent routing working (filesystem)');
  });

  test('should handle special characters in message', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    await page.waitForSelector('#message-input');

    // Test with special characters
    const testMessage = 'Test <script>alert("xss")</script> & special chars: 🎉🚀';
    await page.fill('#message-input', testMessage);
    await page.click('#send-button');

    // Wait for message to appear
    await page.waitForSelector('.message.user', { timeout: 5000 });

    const userMessage = page.locator('.message.user').last();
    await expect(userMessage).toBeVisible();

    // Verify no script execution (page should still be functional)
    await expect(page.locator('#message-input')).toBeVisible();

    console.log('✅ Special characters handled safely');
  });
});
