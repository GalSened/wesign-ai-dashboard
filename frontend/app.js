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
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const attachedFiles = document.getElementById('attachedFiles');
const loadingIndicator = document.getElementById('loadingIndicator');

// State
let conversationId = null;
let selectedFiles = [];
let isProcessing = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    checkOrchestratorConnection();
});

function initEventListeners() {
    // Modal controls
    openAIBtn.addEventListener('click', openModal);
    closeAIBtn.addEventListener('click', closeModal);
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

    // Input controls
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // File upload
    fileInput.addEventListener('change', handleFileSelect);
}

function openModal() {
    modal.classList.add('active');
    messageInput.focus();
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

// Handle file selection
function handleFileSelect(event) {
    const files = Array.from(event.target.files);

    for (const file of files) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            addSystemMessage(`File "${file.name}" is too large. Maximum size is 10MB.`);
            continue;
        }

        // Add to selected files
        selectedFiles.push(file);

        // Create file tag
        const fileTag = document.createElement('div');
        fileTag.className = 'file-tag';
        fileTag.innerHTML = `
            📄 ${file.name} (${formatFileSize(file.size)})
            <button onclick="removeFile('${file.name}')">×</button>
        `;
        attachedFiles.appendChild(fileTag);
    }

    // Reset input
    fileInput.value = '';
}

function removeFile(fileName) {
    selectedFiles = selectedFiles.filter(f => f.name !== fileName);

    // Remove from UI
    const fileTags = attachedFiles.querySelectorAll('.file-tag');
    fileTags.forEach(tag => {
        if (tag.textContent.includes(fileName)) {
            tag.remove();
        }
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Send message to AI assistant
async function sendMessage() {
    const message = messageInput.value.trim();

    if (!message && selectedFiles.length === 0) {
        return;
    }

    if (isProcessing) {
        return;
    }

    isProcessing = true;
    sendBtn.disabled = true;
    loadingIndicator.classList.add('active');

    // Add user message to chat
    addMessage('user', message, selectedFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
    })));

    // Clear input
    messageInput.value = '';
    const filesInfo = [...selectedFiles];
    selectedFiles = [];
    attachedFiles.innerHTML = '';

    try {
        // Upload files first if any
        const uploadedFiles = [];
        for (const file of filesInfo) {
            try {
                const formData = new FormData();
                formData.append('file', file);

                const uploadResponse = await fetch(`${CONFIG.orchestratorUrl}/api/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    uploadedFiles.push({
                        fileId: uploadResult.fileId,
                        fileName: file.name,
                        filePath: uploadResult.filePath
                    });
                } else {
                    throw new Error(`Upload failed for ${file.name}`);
                }
            } catch (error) {
                addSystemMessage(`Failed to upload ${file.name}: ${error.message}`);
            }
        }

        // Send message to orchestrator
        const response = await fetch(`${CONFIG.orchestratorUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                context: {
                    userId: CONFIG.userId,
                    companyId: CONFIG.companyId,
                    userName: CONFIG.userName,
                    conversationId: conversationId
                },
                files: uploadedFiles
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Update conversation ID
        conversationId = result.conversationId;

        // Add assistant response
        addMessage('assistant', result.response, null, result.toolCalls);

    } catch (error) {
        console.error('Error sending message:', error);
        addSystemMessage(`Error: ${error.message}. Make sure the orchestrator is running.`);
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        loadingIndicator.classList.remove('active');
    }
}

// Add message to chat
function addMessage(role, content, files = null, toolCalls = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const avatar = role === 'assistant' ? '🤖' : '👤';

    let filesHtml = '';
    if (files && files.length > 0) {
        filesHtml = '<div style="margin-top: 0.5rem;">' +
            files.map(f => `<div style="font-size: 0.85rem; color: #666;">📄 ${f.name}</div>`).join('') +
            '</div>';
    }

    let toolCallsHtml = '';
    if (toolCalls && toolCalls.length > 0) {
        toolCallsHtml = `
            <div class="tool-calls">
                <strong>🔧 Actions Performed:</strong>
                <ul style="margin: 0.5rem 0 0 1rem; padding: 0;">
                    ${toolCalls.map(tc => `
                        <li>${tc.tool}: ${tc.action}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-text">
                ${escapeHtml(content)}
                ${filesHtml}
            </div>
            ${toolCallsHtml}
            <div class="message-time">${formatTime(new Date())}</div>
        </div>
    `;

    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Add system message
function addSystemMessage(content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">ℹ️</div>
        <div class="message-content">
            <div class="message-text" style="background: #fff3cd; color: #856404;">
                ${escapeHtml(content)}
            </div>
            <div class="message-time">${formatTime(new Date())}</div>
        </div>
    `;
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Utility functions
function scrollToBottom() {
    setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 100);
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make removeFile available globally
window.removeFile = removeFile;

// Console startup message
console.log('%c🤖 WeSign AI Assistant', 'font-size: 20px; font-weight: bold; color: #667eea;');
console.log('%cPowered by AutoGen & MCP', 'font-size: 14px; color: #764ba2;');
console.log(`%cOrchestrator URL: ${CONFIG.orchestratorUrl}`, 'color: #3498db;');
console.log('%cMake sure the Python orchestrator is running!', 'color: #e74c3c; font-weight: bold;');
