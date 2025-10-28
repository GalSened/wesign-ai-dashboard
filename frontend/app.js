// Configuration
const CONFIG = {
    orchestratorUrl: 'http://localhost:8000', // Python AutoGen orchestrator
    userId: 'demo-user-123',
    companyId: 'demo-company-456',
    userName: 'John Doe'
};

// DOM Elements
const openAIBtn = document.getElementById('openAIAssistant');
const closeAIBtn = document.getElementById('closeAIAssistant');
const modal = document.getElementById('aiAssistantModal');
const chatkitContainer = document.getElementById('chatkitContainer');

// State
let chatkitInstance = null;
let sessionToken = null;
let isInitialized = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('%c🤖 WeSign AI Assistant with ChatKit', 'font-size: 20px; font-weight: bold; color: #667eea;');
    console.log('%cPowered by OpenAI ChatKit & AutoGen', 'font-size: 14px; color: #764ba2;');
    console.log(`%cOrchestrator URL: ${CONFIG.orchestratorUrl}`, 'color: #3498db;');

    initEventListeners();
    checkOrchestratorConnection();
});

function initEventListeners() {
    // Modal controls
    openAIBtn.addEventListener('click', openModal);
    closeAIBtn.addEventListener('click', closeModal);
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
}

async function openModal() {
    modal.classList.add('active');

    // Initialize ChatKit on first open
    if (!isInitialized) {
        await initializeChatKit();
    }
}

function closeModal() {
    modal.classList.remove('active');
}

// Check if orchestrator is running
async function checkOrchestratorConnection() {
    try {
        const response = await fetch(`${CONFIG.orchestratorUrl}/health`);
        if (response.ok) {
            console.log('✅ Connected to AutoGen orchestrator');
        } else {
            console.warn('⚠️ Orchestrator responded but may not be healthy');
        }
    } catch (error) {
        console.error('❌ Cannot connect to orchestrator:', error);
        console.warn('Make sure the Python orchestrator is running on', CONFIG.orchestratorUrl);
    }
}

async function initializeChatKit() {
    try {
        console.log('🔄 Initializing ChatKit...');

        // Show loading state
        showLoadingState('Creating session...');

        // Create session with orchestrator
        const sessionResponse = await fetch(`${CONFIG.orchestratorUrl}/api/create-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: CONFIG.userId,
                companyId: CONFIG.companyId,
                userName: CONFIG.userName
            })
        });

        if (!sessionResponse.ok) {
            throw new Error(`Session creation failed: ${sessionResponse.statusText}`);
        }

        const sessionData = await sessionResponse.json();
        sessionToken = sessionData.sessionToken;

        console.log('✅ Session created:', sessionData.user.name);

        // Show loading state
        showLoadingState('Loading ChatKit...');

        // Wait for ChatKit script to load
        await waitForChatKit();

        // Create ChatKit web component
        const chatkit = document.createElement('openai-chatkit');

        // Configure ChatKit with proper authentication
        chatkit.setOptions({
            api: {
                async getClientSecret() {
                    // Fetch client token from backend
                    const response = await fetch(`${CONFIG.orchestratorUrl}/api/chatkit-client-token`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: CONFIG.userId,
                            companyId: CONFIG.companyId,
                            userName: CONFIG.userName
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to get client token: ${response.statusText}`);
                    }

                    const data = await response.json();
                    return data.client_secret;
                }
            },
            theme: {
                colorScheme: 'light',
                color: {
                    accent: {
                        primary: '#667eea',
                        level: 2
                    }
                },
                radius: 'round',
                density: 'normal',
                typography: {
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                }
            },
            startScreen: {
                greeting: `Hello ${CONFIG.userName}! I'm your WeSign AI Assistant. I can help you with:\n\n📄 Upload and manage documents\n✍️ Create and complete signature workflows\n📋 Manage templates\n👥 Handle multi-party signing\n📊 Get document status and information\n\nHow can I help you today?`
            },
            composer: {
                placeholder: 'Ask me about documents, signatures, templates...'
            }
        });

        // Add styles to make ChatKit fill container
        chatkit.style.width = '100%';
        chatkit.style.height = '100%';
        chatkit.classList.add('wesign-chatkit');

        // Clear loading state and add ChatKit
        chatkitContainer.innerHTML = '';
        chatkitContainer.appendChild(chatkit);

        // Store reference
        chatkitInstance = chatkit;
        isInitialized = true;

        console.log('✅ ChatKit initialized successfully');

        // Add event listeners for ChatKit events
        chatkit.addEventListener('message', (event) => {
            console.log('💬 User message:', event.detail);
        });

        chatkit.addEventListener('response', (event) => {
            console.log('🤖 Assistant response:', event.detail);
        });

        chatkit.addEventListener('error', (event) => {
            console.error('❌ ChatKit error:', event.detail);
            showError('An error occurred. Please try again.');
        });

    } catch (error) {
        console.error('❌ Failed to initialize ChatKit:', error);
        showError(`Failed to initialize AI Assistant: ${error.message}`);
    }
}

function waitForChatKit() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max

        const checkInterval = setInterval(() => {
            attempts++;

            if (typeof customElements !== 'undefined' && customElements.get('openai-chatkit')) {
                clearInterval(checkInterval);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                reject(new Error('ChatKit script failed to load'));
            }
        }, 100);
    });
}

function showLoadingState(message) {
    chatkitContainer.innerHTML = `
        <div class="chatkit-loading">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

function showError(message) {
    chatkitContainer.innerHTML = `
        <div class="chatkit-error">
            <div class="error-icon">⚠️</div>
            <p>${message}</p>
            <button onclick="location.reload()" class="retry-btn">Retry</button>
        </div>
    `;
}

// Console startup message
console.log('%c⚡ Ready to assist!', 'font-size: 16px; color: #4ade80; font-weight: bold;');
console.log('%cClick the AI Assistant button to get started', 'color: #667eea;');
