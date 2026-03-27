// WeSign AI Assistant E2E Tests
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8000';

test.describe('WeSign AI Assistant E2E Tests', () => {

  test('should load UI successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    // Check header navbar is visible
    await expect(page.locator('.chat-header')).toBeVisible();

    // Check input field exists
    await expect(page.locator('#chatInput')).toBeVisible();

    // Check voice button exists
    await expect(page.locator('#micButton')).toBeVisible();

    // Check send button exists
    await expect(page.locator('#sendButton')).toBeVisible();

    console.log('UI loaded successfully');
  });

  test('should send text message and receive response', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    // Wait for page to be ready
    await page.waitForSelector('#chatInput');

    // Type and send message
    await page.fill('#chatInput', 'Hello, this is a test message');
    await page.click('#sendButton');

    // Wait for user message to appear
    await page.waitForSelector('.message.user', { timeout: 5000 });

    // Verify message appeared
    const userMessage = page.locator('.message.user').last();
    await expect(userMessage).toContainText('Hello, this is a test message');

    // Wait for assistant response (max 15 seconds)
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 15000 });

    // Verify response appeared
    const messages = await page.locator('.message.assistant').count();
    expect(messages).toBeGreaterThanOrEqual(1);

    console.log('Text chat working');
  });

  test('should display voice recording button', async ({ page, context }) => {
    // Grant microphone permission
    await context.grantPermissions(['microphone']);

    await page.goto(`${BASE_URL}/ui`);

    const voiceButton = page.locator('#micButton');
    await expect(voiceButton).toBeVisible();

    console.log('Voice button visible');
  });

  test('should show header with logo', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    // Check header is visible
    const header = page.locator('.chat-header');
    await expect(header).toBeVisible();

    // Check subtitle text
    await expect(page.locator('.subtitle')).toContainText('AI Assistant');

    console.log('Header displayed correctly');
  });

  test('should handle empty message submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    await page.waitForSelector('#chatInput');

    // Try to send empty message
    const messageCountBefore = await page.locator('.message').count();
    await page.click('#sendButton');

    // Wait a moment
    await page.waitForTimeout(500);

    // Count should not increase (only welcome card should exist)
    const messageCountAfter = await page.locator('.message').count();
    expect(messageCountAfter).toBe(messageCountBefore);

    console.log('Empty message handled');
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
    console.log('Health check successful');
  });

  test('should test agent routing - filesystem request', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    await page.waitForSelector('#chatInput');

    // Send filesystem-related message
    await page.fill('#chatInput', 'Can you list files in my Documents folder?');
    await page.click('#sendButton');

    // Wait for response
    await page.waitForSelector('.message.assistant[data-status="complete"]', { timeout: 15000 });

    const lastResponse = page.locator('.message.assistant[data-status="complete"]').last();
    const responseText = await lastResponse.textContent();

    // Response should mention documents or directories
    const hasRelevantResponse =
      responseText.toLowerCase().includes('document') ||
      responseText.toLowerCase().includes('file') ||
      responseText.toLowerCase().includes('directory') ||
      responseText.toLowerCase().includes('folder') ||
      responseText.toLowerCase().includes('allowed');

    expect(hasRelevantResponse).toBe(true);
    console.log('Agent routing working (filesystem)');
  });

  test('should handle special characters in message', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    await page.waitForSelector('#chatInput');

    // Test with special characters
    const testMessage = 'Test <script>alert("xss")</script> & special chars';
    await page.fill('#chatInput', testMessage);
    await page.click('#sendButton');

    // Wait for message to appear
    await page.waitForSelector('.message.user', { timeout: 5000 });

    const userMessage = page.locator('.message.user').last();
    await expect(userMessage).toBeVisible();

    // Verify no script execution (page should still be functional)
    await expect(page.locator('#chatInput')).toBeVisible();

    console.log('Special characters handled safely');
  });

  test('should display welcome card on load', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    // Check welcome card is visible
    const welcomeCard = page.locator('.welcome-card');
    await expect(welcomeCard).toBeVisible();

    // Check it has content
    await expect(welcomeCard.locator('h3')).toBeVisible();
    await expect(welcomeCard.locator('ul')).toBeVisible();

    console.log('Welcome card displayed');
  });

  test('should display file upload zone', async ({ page }) => {
    await page.goto(`${BASE_URL}/ui`);

    // Check upload zone is visible
    const uploadZone = page.locator('.file-upload-zone');
    await expect(uploadZone).toBeVisible();

    // Check upload hint text
    await expect(uploadZone.locator('.upload-hint')).toContainText('PDF');

    console.log('File upload zone displayed');
  });

  test('should show logout button when authenticated', async ({ page }) => {
    // Set auth token in storage before navigating
    await page.goto(`${BASE_URL}/ui`);
    await page.evaluate(() => {
      sessionStorage.setItem('wesign_auth_token', 'test-token');
      sessionStorage.setItem('wesign_user_name', 'Test User');
      sessionStorage.setItem('wesign_user_email', 'test@example.com');
    });
    await page.reload();

    // Wait for page to load
    await page.waitForSelector('#chatInput');

    // Check logout button is visible
    const logoutButton = page.locator('#logoutButton');
    await expect(logoutButton).toBeVisible();

    // Check profile info is visible
    const profileInfo = page.locator('#profileInfo');
    await expect(profileInfo).toBeVisible();

    // Check avatar has correct initial
    const avatar = page.locator('#profileAvatar');
    await expect(avatar).toContainText('T');

    console.log('Auth UI elements displayed');
  });
});
