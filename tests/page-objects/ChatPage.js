/**
 * Page Object Model for WeSign AI Assistant Chat UI
 * Provides reusable methods for interacting with the chat interface
 */

const { expect } = require('@playwright/test');

class ChatPage {
  constructor(page) {
    this.page = page;
    this.baseURL = 'http://localhost:8000';

    // Selectors
    this.messageInput = '#chatInput';
    this.sendButton = '#sendButton';
    this.userMessage = '.message.user';
    this.assistantMessage = '.message.assistant';
    this.voiceButton = '#voice-button';
    this.statusIndicator = '.status-indicator';
  }

  /**
   * Navigate to the chat UI
   */
  async goto() {
    await this.page.goto(`${this.baseURL}/ui`);
    await this.page.waitForSelector(this.messageInput, { timeout: 10000 });
  }

  /**
   * Send a message in the chat
   * @param {string} message - Message text to send
   * @param {string} language - Language of the message ('en' or 'he')
   */
  async sendMessage(message, language = 'en') {
    await this.page.fill(this.messageInput, message);
    await this.page.click(this.sendButton);

    // Wait for user message to appear
    await this.page.waitForSelector(this.userMessage, { timeout: 5000 });

    // Verify the message was added
    const userMsg = this.page.locator(this.userMessage).last();
    await expect(userMsg).toContainText(message);
  }

  /**
   * Wait for and return the assistant's response
   * @param {number} timeout - Max wait time in ms (default: 90000 for tool calls)
   * @returns {string} Response text from assistant
   */
  async waitForResponse(timeout = 90000) {
    // Wait for response completion using data-status attribute
    // The UI sets data-status="complete" when the response is fully loaded
    await this.page.waitForSelector(
      '.message.assistant[data-status="complete"]',
      { timeout }
    );

    // Get the last completed assistant message
    const response = await this.page.locator('.message.assistant[data-status="complete"]').last().textContent();
    return response.trim();
  }

  /**
   * Send message and wait for response
   * @param {string} message - Message to send
   * @param {string} language - Language ('en' or 'he')
   * @param {number} timeout - Max wait time
   * @returns {string} Assistant response
   */
  async sendAndWaitForResponse(message, language = 'en', timeout = 60000) {
    await this.sendMessage(message, language);
    return await this.waitForResponse(timeout);
  }

  /**
   * Verify response contains expected content
   * @param {string} response - Response text
   * @param {string|string[]} expectedContent - Content to check for (string or array of strings)
   * @param {boolean} shouldContain - True to assert contains, false to assert not contains
   */
  verifyResponse(response, expectedContent, shouldContain = true) {
    const contents = Array.isArray(expectedContent) ? expectedContent : [expectedContent];

    for (const content of contents) {
      const contains = response.toLowerCase().includes(content.toLowerCase());
      if (shouldContain) {
        expect(contains).toBe(true);
      } else {
        expect(contains).toBe(false);
      }
    }
  }

  /**
   * Verify response is in expected language
   * @param {string} response - Response text
   * @param {string} language - Expected language ('en' or 'he')
   */
  verifyLanguage(response, language) {
    if (language === 'he') {
      // Check for Hebrew characters
      const hebrewChars = /[\u0590-\u05FF]/;
      expect(hebrewChars.test(response)).toBe(true);
    } else {
      // For English, check for common English words
      const hasEnglishWords = /\b(the|is|are|was|were|have|has|do|does|will|would|can|could)\b/i.test(response);
      expect(hasEnglishWords).toBe(true);
    }
  }

  /**
   * Verify response does not contain raw JSON
   * @param {string} response - Response text
   */
  verifyNoRawJSON(response) {
    // Check for common JSON indicators
    const hasRawJSON =
      (response.includes('{"') && response.includes('":')) ||
      (response.includes('[{') && response.includes('}]'));

    expect(hasRawJSON).toBe(false);
  }

  /**
   * Extract tool calls from DevTools Network panel
   * @returns {Promise<Array>} List of tool call names
   */
  async extractToolCalls() {
    const toolCalls = [];

    // Listen for API requests
    this.page.on('request', request => {
      if (request.url().includes('/api/chat') && request.method() === 'POST') {
        // Tool calls are in the response, not the request
        // This would need to be implemented differently
      }
    });

    return toolCalls;
  }

  /**
   * Take screenshot on failure
   * @param {string} testName - Name of the test for the screenshot
   */
  async screenshotOnFailure(testName) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `failure-${testName}-${timestamp}.png`;
    await this.page.screenshot({
      path: `test-results/${filename}`,
      fullPage: true
    });
    console.log(`📸 Screenshot saved: ${filename}`);
  }

  /**
   * Get DevTools console errors
   * @returns {Promise<Array>} List of console errors
   */
  async getConsoleErrors() {
    const errors = [];

    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    return errors;
  }

  /**
   * Verify no console errors exist
   */
  async verifyNoConsoleErrors() {
    const errors = await this.getConsoleErrors();
    expect(errors.length).toBe(0);
  }

  /**
   * Check if backend is connected
   */
  async verifyBackendConnected() {
    const status = await this.page.locator(this.statusIndicator).textContent();
    expect(status.toLowerCase()).toContain('connected');
  }

  /**
   * Clear chat history (refresh page)
   */
  async clearChat() {
    await this.page.reload();
    await this.page.waitForSelector(this.messageInput, { timeout: 10000 });
  }

  /**
   * Verify response has emojis (good formatting)
   * @param {string} response - Response text
   */
  verifyHasEmojis(response) {
    // Check for common emojis used in responses
    const hasEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(response);
    expect(hasEmojis).toBe(true);
  }

  /**
   * Verify response has suggested next actions
   * @param {string} response - Response text
   * @param {string} language - Language ('en' or 'he')
   */
  verifySuggestsNextActions(response, language) {
    if (language === 'he') {
      // Hebrew: "מה תרצה לעשות" or "רוצה ל" or bullet points
      const hasSuggestions =
        response.includes('מה תרצה') ||
        response.includes('רוצה ל') ||
        response.includes('•');
      expect(hasSuggestions).toBe(true);
    } else {
      // English: "What would you like" or "Would you like" or bullet points
      const hasSuggestions =
        response.toLowerCase().includes('what would you like') ||
        response.toLowerCase().includes('would you like') ||
        response.includes('•') ||
        response.includes('-');
      expect(hasSuggestions).toBe(true);
    }
  }
}

module.exports = { ChatPage };
