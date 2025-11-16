// Configuration
const CONFIG = {
    orchestratorUrl: 'http://localhost:8002', // Python AutoGen orchestrator
    userId: 'demo-user-123',
    companyId: 'demo-company-456',
    userName: 'John Doe'
};

// DOM Elements
const openAIBtn = document.getElementById('openAIAssistant');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('%c🤖 WeSign AI Assistant', 'font-size: 20px; font-weight: bold; color: #667eea;');
    console.log('%cPowered by AutoGen Multi-Agent System', 'font-size: 14px; color: #764ba2;');
    console.log(`%cOrchestrator URL: ${CONFIG.orchestratorUrl}`, 'color: #3498db;');

    initEventListeners();
    checkOrchestratorConnection();
});

function initEventListeners() {
    // Open chat interface
    openAIBtn.addEventListener('click', () => {
        window.location.href = 'chat-simple.html';
    });
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

// Console startup message
console.log('%c⚡ Ready to assist!', 'font-size: 16px; color: #4ade80; font-weight: bold;');
console.log('%cClick the AI Assistant button to get started', 'color: #667eea;');
