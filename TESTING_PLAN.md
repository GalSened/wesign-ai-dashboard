# WeSign AI Assistant - Comprehensive Testing Plan

## Overview

This document provides a thorough testing plan to verify all features, edge cases, error handling, and integration points of the WeSign AI Assistant with voice-to-text functionality.

**Testing Objectives**:
- Verify all core features function correctly
- Validate edge cases and error handling
- Ensure security and data protection
- Test performance and scalability
- Confirm browser compatibility
- Validate AutoGen multi-agent orchestration
- Test MCP tool integration

---

## 1. Functional Testing

### 1.1 Backend Health & Initialization

**Test Case 1.1.1: Server Startup**
- **Objective**: Verify server starts correctly with all dependencies
- **Steps**:
  1. Start server: `cd orchestrator && source venv/bin/activate && python main.py`
  2. Verify startup logs show no errors
  3. Check all agents initialize successfully
- **Expected Results**:
  - Server starts on port 8000
  - All 5 agents load (Admin, Filesystem, Compliance, Contract, Document)
  - MCP servers initialize (FileSystem, Postman, etc.)
  - No error messages in startup logs
- **Pass Criteria**: Clean startup with all services running

**Test Case 1.1.2: Health Endpoint**
- **Objective**: Verify health check endpoint
- **Steps**:
  1. Request: `GET http://localhost:8000/health`
  2. Verify response structure
- **Expected Results**:
  ```json
  {
    "status": "healthy",
    "version": "2.0.0-native-mcp",
    "agents": {
      "admin_assistant": "active",
      "filesystem_manager": "active",
      ...
    },
    "mcp_servers": [...]
  }
  ```
- **Pass Criteria**: HTTP 200, all agents active

**Test Case 1.1.3: UI Endpoints**
- **Objective**: Verify all UI endpoints serve correctly
- **Steps**:
  1. Request: `GET http://localhost:8000/ui`
  2. Request: `GET http://localhost:8000/chatkit`
  3. Request: `GET http://localhost:8000/official-chatkit.html`
- **Expected Results**:
  - All endpoints return HTTP 200
  - HTML content contains expected elements
  - No 404 or 500 errors
- **Pass Criteria**: All UI pages accessible

---

### 1.2 Text Chat Functionality

**Test Case 1.2.1: Basic Text Message**
- **Objective**: Verify simple text chat works end-to-end
- **Steps**:
  1. Open UI: `http://localhost:8000/ui`
  2. Type: "Hello, can you help me?"
  3. Click send button
  4. Wait for response
- **Expected Results**:
  - Message appears in chat with user avatar
  - Typing indicator shows while processing
  - AI response appears with assistant avatar
  - Response is relevant and coherent
- **Pass Criteria**: Complete message exchange with no errors

**Test Case 1.2.2: Long Message**
- **Objective**: Test handling of long text inputs
- **Steps**:
  1. Type a message with 500+ characters
  2. Send message
  3. Verify processing and response
- **Expected Results**:
  - Long message accepted without truncation
  - UI displays message with proper wrapping
  - Response generated successfully
- **Pass Criteria**: Long messages handled correctly

**Test Case 1.2.3: Special Characters**
- **Objective**: Test message handling with special characters
- **Steps**:
  1. Send messages containing: `<script>alert('test')</script>`
  2. Send emojis: "Hello 🎉🚀✨"
  3. Send HTML: `<b>Bold text</b>`
  4. Send code: `` `function test() {}` ``
- **Expected Results**:
  - No XSS vulnerabilities
  - Special characters displayed correctly
  - HTML properly escaped
  - No script execution
- **Pass Criteria**: Safe handling of all special characters

**Test Case 1.2.4: Empty Message**
- **Objective**: Test empty message handling
- **Steps**:
  1. Click send with empty input
  2. Send whitespace-only message
- **Expected Results**:
  - Empty messages not sent
  - No error messages displayed
  - Input field remains focused
- **Pass Criteria**: Empty messages rejected gracefully

**Test Case 1.2.5: Rapid Message Sending**
- **Objective**: Test rapid consecutive messages
- **Steps**:
  1. Send 5 messages in quick succession
  2. Verify all messages processed
- **Expected Results**:
  - All messages queued and processed
  - Responses appear in correct order
  - No messages lost
  - No UI freezing
- **Pass Criteria**: All messages processed correctly

**Test Case 1.2.6: Conversation Context**
- **Objective**: Verify conversation history maintained
- **Steps**:
  1. Send: "My name is John"
  2. Send: "What is my name?"
  3. Verify AI remembers context
- **Expected Results**:
  - AI responds with "John"
  - conversationId maintained across messages
  - Context preserved in session
- **Pass Criteria**: Conversation context working

---

### 1.3 Voice Recording Functionality

**Test Case 1.3.1: Microphone Permission Request**
- **Objective**: Verify microphone permission flow
- **Steps**:
  1. Open UI in fresh browser/incognito
  2. Click microphone button 🎤
  3. Observe permission prompt
- **Expected Results**:
  - Browser requests microphone permission
  - Clear permission dialog displayed
  - App waits for user decision
- **Pass Criteria**: Permission requested correctly

**Test Case 1.3.2: Permission Granted - Start Recording**
- **Objective**: Test recording start with permission
- **Steps**:
  1. Click microphone button
  2. Grant permission
  3. Observe recording state
- **Expected Results**:
  - Button changes to ⏹️ (stop icon)
  - Button shows pulse animation
  - Recording indicator active
  - Console log: "🎤 Recording started"
- **Pass Criteria**: Recording starts successfully

**Test Case 1.3.3: Permission Denied**
- **Objective**: Test handling of denied permission
- **Steps**:
  1. Click microphone button
  2. Deny permission
  3. Observe error handling
- **Expected Results**:
  - Alert message displayed
  - Message: "Microphone access is required..."
  - Button returns to 🎤
  - No recording started
- **Pass Criteria**: Graceful permission denial handling

**Test Case 1.3.4: Recording and Stopping**
- **Objective**: Test complete record → stop flow
- **Steps**:
  1. Start recording
  2. Speak for 5 seconds: "Test message one two three"
  3. Click stop button ⏹️
  4. Wait for transcription
- **Expected Results**:
  - Recording stops immediately
  - Button returns to 🎤
  - Typing indicator appears
  - Transcribed text appears in input field
  - Console log: "⏹️ Recording stopped"
- **Pass Criteria**: Complete recording cycle works

**Test Case 1.3.5: Very Short Recording (<1 second)**
- **Objective**: Test handling of very brief audio
- **Steps**:
  1. Start recording
  2. Immediately stop (<1 second)
  3. Observe behavior
- **Expected Results**:
  - Audio captured and sent
  - Transcription attempted
  - May return empty or error
  - No app crash
- **Pass Criteria**: Short audio handled without crash

**Test Case 1.3.6: Long Recording (>2 minutes)**
- **Objective**: Test extended recording duration
- **Steps**:
  1. Start recording
  2. Record for 3+ minutes
  3. Stop and transcribe
- **Expected Results**:
  - Audio continues recording
  - File size within Whisper limits (25MB)
  - Transcription successful
  - Complete text returned
- **Pass Criteria**: Long recordings work

**Test Case 1.3.7: Recording Cancellation**
- **Objective**: Test starting then canceling
- **Steps**:
  1. Start recording
  2. Refresh page or navigate away
  3. Return and try again
- **Expected Results**:
  - MediaRecorder stream properly cleaned up
  - No lingering microphone access
  - Can restart recording
- **Pass Criteria**: Clean cancellation handling

---

### 1.4 Speech-to-Text Transcription

**Test Case 1.4.1: Clear Speech Transcription**
- **Objective**: Test accurate transcription of clear speech
- **Steps**:
  1. Record: "Hello, I need help with document signing"
  2. Stop and wait for transcription
  3. Review transcribed text
- **Expected Results**:
  - Text appears in input field
  - Transcription highly accurate (>95%)
  - Proper capitalization and punctuation
  - Input field focused for editing
- **Pass Criteria**: Accurate transcription

**Test Case 1.4.2: Transcription Endpoint Direct Test**
- **Objective**: Test /api/speech-to-text endpoint directly
- **Steps**:
  1. Create audio file (test.wav)
  2. Request:
     ```bash
     curl -X POST http://localhost:8000/api/speech-to-text \
       -F "file=@test.wav" \
       -H "Content-Type: multipart/form-data"
     ```
  3. Verify response
- **Expected Results**:
  ```json
  {
    "text": "transcribed text here",
    "filename": "test.wav",
    "size": 12345
  }
  ```
- **Pass Criteria**: Endpoint returns transcription

**Test Case 1.4.3: Different Audio Formats**
- **Objective**: Test support for various audio formats
- **Steps**:
  1. Test with: WAV, MP3, M4A, WEBM files
  2. Upload each format to endpoint
  3. Verify transcription
- **Expected Results**:
  - All supported formats accepted
  - Successful transcription for each
  - Proper content-type handling
- **Pass Criteria**: All formats work

**Test Case 1.4.4: Transcription with Background Noise**
- **Objective**: Test transcription quality with noise
- **Steps**:
  1. Record with background music/noise
  2. Stop and transcribe
  3. Evaluate accuracy
- **Expected Results**:
  - Transcription still attempted
  - Core message captured
  - Quality depends on noise level
  - No errors or crashes
- **Pass Criteria**: Noisy audio handled

**Test Case 1.4.5: Non-English Speech**
- **Objective**: Test multilingual support (if applicable)
- **Steps**:
  1. Record speech in Spanish/French/Hebrew
  2. Transcribe
  3. Check output
- **Expected Results**:
  - Whisper API attempts transcription
  - May auto-detect language
  - Text returned in spoken language
- **Pass Criteria**: Non-English handled

**Test Case 1.4.6: Silence Recording**
- **Objective**: Test recording with no speech
- **Steps**:
  1. Start recording
  2. Remain silent for 10 seconds
  3. Stop and transcribe
- **Expected Results**:
  - Audio file created (small size)
  - Transcription returns empty or minimal text
  - No error thrown
  - User can retry
- **Pass Criteria**: Silence handled gracefully

---

### 1.5 Session Management

**Test Case 1.5.1: Session Creation**
- **Objective**: Test session token generation
- **Steps**:
  1. Request:
     ```bash
     curl -X POST http://localhost:8000/api/chatkit/session \
       -H "Content-Type: application/json" \
       -d '{"userId":"test-user","companyId":"test-company","userName":"Test User"}'
     ```
  2. Verify response
- **Expected Results**:
  ```json
  {
    "client_secret": "32-byte-token",
    "session_id": "same-as-token",
    "user": {
      "id": "test-user",
      "name": "Test User",
      "companyId": "test-company"
    }
  }
  ```
- **Pass Criteria**: Valid token returned

**Test Case 1.5.2: Token Uniqueness**
- **Objective**: Verify each session gets unique token
- **Steps**:
  1. Create 10 sessions
  2. Collect all tokens
  3. Check for duplicates
- **Expected Results**:
  - All tokens unique
  - Each 32 bytes URL-safe base64
  - No collisions
- **Pass Criteria**: All tokens unique

**Test Case 1.5.3: Session Context Storage**
- **Objective**: Verify user context stored with token
- **Steps**:
  1. Create session with specific user data
  2. Backend logs should show stored context
  3. Verify internal storage
- **Expected Results**:
  - session_tokens dict contains entry
  - User data correctly stored
  - Timestamp recorded
- **Pass Criteria**: Context stored correctly

---

### 1.6 File Upload (if implemented)

**Test Case 1.6.1: Document Upload**
- **Objective**: Test file upload endpoint
- **Steps**:
  1. Request:
     ```bash
     curl -X POST http://localhost:8000/api/upload \
       -F "file=@test-document.pdf"
     ```
  2. Verify processing
- **Expected Results**:
  - File accepted and saved
  - File analysis triggered
  - Response with file metadata
- **Pass Criteria**: Upload successful

**Test Case 1.6.2: Large File Upload**
- **Objective**: Test file size limits
- **Steps**:
  1. Upload 50MB file
  2. Upload 100MB file
  3. Check size validation
- **Expected Results**:
  - Appropriate size limits enforced
  - Clear error message if too large
  - No server crash
- **Pass Criteria**: Size limits enforced

---

## 2. Edge Cases Testing

### 2.1 Audio File Edge Cases

**Test Case 2.1.1: Empty Audio File**
- **Objective**: Test zero-byte audio handling
- **Steps**:
  1. Create empty file: `touch empty.wav`
  2. Upload to endpoint
- **Expected Results**:
  - HTTP 400 Bad Request
  - Message: "Audio file is empty."
  - No Whisper API call made
- **Pass Criteria**: Empty file rejected

**Test Case 2.1.2: Oversized Audio (>25MB)**
- **Objective**: Test Whisper API size limit enforcement
- **Steps**:
  1. Create or find 30MB audio file
  2. Upload to endpoint
- **Expected Results**:
  - HTTP 400 Bad Request
  - Message: "Audio file too large. Maximum size is 25MB."
  - No Whisper API call made
- **Pass Criteria**: Large file rejected

**Test Case 2.1.3: Corrupted Audio File**
- **Objective**: Test handling of invalid audio
- **Steps**:
  1. Create file with random bytes, name as .wav
  2. Upload to endpoint
- **Expected Results**:
  - Whisper API error caught
  - HTTP 500 with descriptive message
  - Temp file cleaned up
- **Pass Criteria**: Graceful error handling

**Test Case 2.1.4: Unsupported Format**
- **Objective**: Test rejection of unsupported formats
- **Steps**:
  1. Upload .txt file as audio
  2. Upload .exe file as audio
- **Expected Results**:
  - Warning logged about unsupported type
  - Still attempts processing (Whisper may reject)
  - Proper error message returned
- **Pass Criteria**: Unsupported formats handled

---

### 2.2 Network & Connectivity Edge Cases

**Test Case 2.2.1: Backend Offline**
- **Objective**: Test frontend behavior when backend down
- **Steps**:
  1. Open UI
  2. Stop backend server
  3. Try sending message
- **Expected Results**:
  - Health check fails
  - Warning message displayed
  - Status indicator shows disconnected
  - User informed of connection issue
- **Pass Criteria**: Graceful offline handling

**Test Case 2.2.2: Slow Network**
- **Objective**: Test behavior with high latency
- **Steps**:
  1. Use browser DevTools to throttle network
  2. Record and send voice message
  3. Observe loading states
- **Expected Results**:
  - Typing indicator remains visible
  - Request eventually completes or times out
  - Clear timeout message if applicable
  - No UI freeze
- **Pass Criteria**: Handles latency gracefully

**Test Case 2.2.3: Network Interruption During Upload**
- **Objective**: Test upload interrupted mid-transfer
- **Steps**:
  1. Start audio transcription
  2. Disconnect network mid-upload
  3. Observe error handling
- **Expected Results**:
  - Network error caught
  - Error message displayed to user
  - Typing indicator removed
  - Can retry when reconnected
- **Pass Criteria**: Interruption handled

**Test Case 2.2.4: OpenAI API Rate Limiting**
- **Objective**: Test handling of Whisper API limits
- **Steps**:
  1. Send many transcription requests rapidly
  2. Trigger rate limit (if possible)
  3. Observe error handling
- **Expected Results**:
  - Rate limit error caught
  - User informed of temporary unavailability
  - Suggested retry later
  - No application crash
- **Pass Criteria**: Rate limits handled

**Test Case 2.2.5: Invalid API Key**
- **Objective**: Test missing/invalid OpenAI API key
- **Steps**:
  1. Set OPENAI_API_KEY to invalid value
  2. Restart server
  3. Attempt transcription
- **Expected Results**:
  - Authentication error from OpenAI
  - HTTP 500 with clear error message
  - Logged with details
  - Temp file cleaned up
- **Pass Criteria**: API auth errors handled

---

### 2.3 Concurrent Access Edge Cases

**Test Case 2.3.1: Multiple Simultaneous Users**
- **Objective**: Test concurrent chat sessions
- **Steps**:
  1. Open 5 browser tabs
  2. Send messages from all simultaneously
  3. Verify responses
- **Expected Results**:
  - All sessions independent
  - No message mixing
  - All responses correct
  - No race conditions
- **Pass Criteria**: Concurrent access works

**Test Case 2.3.2: Simultaneous Transcriptions**
- **Objective**: Test parallel transcription requests
- **Steps**:
  1. From 3 browsers, start recordings
  2. Stop all and transcribe simultaneously
  3. Verify all complete
- **Expected Results**:
  - All transcriptions processed
  - Correct results to each browser
  - No file conflicts in temp directory
  - All temp files cleaned up
- **Pass Criteria**: Parallel transcriptions work

---

### 2.4 Browser & Device Edge Cases

**Test Case 2.4.1: Unsupported Browser**
- **Objective**: Test in browser without MediaRecorder
- **Steps**:
  1. Open in old browser (IE11, old Safari)
  2. Try voice recording
- **Expected Results**:
  - Feature detection should fail
  - Microphone button disabled or hidden
  - Text chat still works
  - User informed voice unavailable
- **Pass Criteria**: Graceful degradation

**Test Case 2.4.2: Mobile Browser**
- **Objective**: Test on iOS Safari and Android Chrome
- **Steps**:
  1. Open UI on mobile device
  2. Test voice recording
  3. Test UI responsiveness
- **Expected Results**:
  - UI adapts to mobile screen
  - Voice recording works (iOS 14.3+)
  - Touch interactions smooth
  - Microphone permissions work
- **Pass Criteria**: Mobile functionality

**Test Case 2.4.3: HTTP vs HTTPS**
- **Objective**: Test microphone access restrictions
- **Steps**:
  1. Test on localhost (HTTP) - should work
  2. Test on remote HTTP - should fail
  3. Test on HTTPS - should work
- **Expected Results**:
  - localhost: microphone access granted
  - HTTP remote: browser blocks microphone
  - HTTPS: microphone access granted
- **Pass Criteria**: Security restrictions enforced

---

### 2.5 UI State Edge Cases

**Test Case 2.5.1: Page Refresh During Recording**
- **Objective**: Test refresh while recording
- **Steps**:
  1. Start recording
  2. Press F5 to refresh
  3. Check microphone release
- **Expected Results**:
  - Recording stops
  - MediaRecorder cleaned up
  - Microphone released (no red indicator in browser)
  - Can record again after refresh
- **Pass Criteria**: Clean state on refresh

**Test Case 2.5.2: Tab Switch During Recording**
- **Objective**: Test backgrounding during recording
- **Steps**:
  1. Start recording
  2. Switch to another tab
  3. Return and stop recording
- **Expected Results**:
  - Recording continues in background
  - Can stop when returning
  - Transcription works normally
- **Pass Criteria**: Background recording works

**Test Case 2.5.3: Browser Back/Forward**
- **Objective**: Test navigation during chat
- **Steps**:
  1. Have conversation
  2. Press back button
  3. Press forward
- **Expected Results**:
  - Navigation may reload page
  - Conversation state may be lost
  - No errors or corruption
  - Can start new conversation
- **Pass Criteria**: Navigation handled

**Test Case 2.5.4: Multiple Tabs Same User**
- **Objective**: Test same user in multiple tabs
- **Steps**:
  1. Open 2 tabs with UI
  2. Send message from tab 1
  3. Send message from tab 2
  4. Check conversations
- **Expected Results**:
  - Each tab independent conversation
  - Different conversationIds
  - No interference between tabs
- **Pass Criteria**: Independent sessions

---

## 3. Integration Testing

### 3.1 End-to-End Voice Workflow

**Test Case 3.1.1: Complete Voice-to-Response Flow**
- **Objective**: Test full cycle from voice to AI response
- **Steps**:
  1. Open UI
  2. Click microphone 🎤
  3. Grant permission
  4. Speak: "Can you help me upload a document?"
  5. Stop recording
  6. Wait for transcription
  7. Review transcribed text
  8. Click send
  9. Wait for AI response
- **Expected Results**:
  - Voice captured successfully
  - Accurate transcription
  - Message sent to backend
  - Appropriate agent selected (Filesystem Manager)
  - Relevant AI response received
  - Complete cycle <10 seconds
- **Pass Criteria**: Seamless end-to-end flow

**Test Case 3.1.2: Voice + Text Alternation**
- **Objective**: Test mixing voice and text input
- **Steps**:
  1. Send voice message
  2. Send text message
  3. Send another voice message
  4. Verify all processed correctly
- **Expected Results**:
  - Both input methods work
  - Conversation context maintained
  - No conflicts between methods
- **Pass Criteria**: Mixed input works

---

### 3.2 AutoGen Agent Selection

**Test Case 3.2.1: Admin Assistant Routing**
- **Objective**: Test routing to Admin agent
- **Steps**:
  1. Send: "What can you help me with?"
  2. Verify admin assistant responds
- **Expected Results**:
  - Admin Assistant agent selected
  - General help information provided
  - Agent capabilities listed
- **Pass Criteria**: Correct agent selected

**Test Case 3.2.2: Filesystem Manager Routing**
- **Objective**: Test routing to Filesystem agent
- **Steps**:
  1. Send: "List files in my Documents folder"
  2. Verify filesystem agent responds
- **Expected Results**:
  - Filesystem Manager agent selected
  - MCP filesystem tools invoked
  - File list returned
- **Pass Criteria**: Filesystem operations work

**Test Case 3.2.3: Compliance Expert Routing**
- **Objective**: Test routing to Compliance agent
- **Steps**:
  1. Send: "Check if this contract meets GDPR requirements"
  2. Verify compliance agent responds
- **Expected Results**:
  - Compliance Expert agent selected
  - Compliance analysis performed
  - Findings reported
- **Pass Criteria**: Compliance checks work

**Test Case 3.2.4: Contract Analyst Routing**
- **Objective**: Test routing to Contract agent
- **Steps**:
  1. Send: "Review this employment contract"
  2. Verify contract agent responds
- **Expected Results**:
  - Contract Analyst agent selected
  - Contract analysis performed
  - Key terms identified
- **Pass Criteria**: Contract analysis works

**Test Case 3.2.5: Document Processor Routing**
- **Objective**: Test routing to Document agent
- **Steps**:
  1. Send: "Extract text from this PDF"
  2. Verify document processor responds
- **Expected Results**:
  - Document Processor agent selected
  - Document processing initiated
  - Text extraction completed
- **Pass Criteria**: Document processing works

**Test Case 3.2.6: Multi-Agent Collaboration**
- **Objective**: Test agents working together
- **Steps**:
  1. Send: "Find all contracts in Documents and check their compliance"
  2. Observe agent collaboration
- **Expected Results**:
  - Filesystem agent lists files
  - Contract agent analyzes each
  - Compliance agent checks each
  - Coordinated response
- **Pass Criteria**: Multi-agent orchestration works

---

### 3.3 MCP Tool Integration

**Test Case 3.3.1: Filesystem MCP Tools**
- **Objective**: Test filesystem MCP server tools
- **Steps**:
  1. Request: "List files in Downloads"
  2. Request: "Read the contents of test.txt"
  3. Request: "Create a new folder called TestFolder"
- **Expected Results**:
  - list_directory tool invoked
  - read_file tool invoked
  - create_directory tool invoked
  - All operations successful
  - Results displayed to user
- **Pass Criteria**: All filesystem tools work

**Test Case 3.3.2: Postman MCP Tools**
- **Objective**: Test Postman API integration
- **Steps**:
  1. Request: "Show me my Postman collections"
  2. Verify Postman tools invoked
- **Expected Results**:
  - Postman MCP server accessed
  - Collections retrieved
  - Data displayed
- **Pass Criteria**: Postman integration works

**Test Case 3.3.3: Tool Permissions**
- **Objective**: Test tool permission boundaries
- **Steps**:
  1. Request: "List files in /etc"
  2. Request: "Read /etc/passwd"
  3. Verify restriction enforcement
- **Expected Results**:
  - Access denied to unauthorized paths
  - Only allowed directories accessible
  - Clear error message
  - No security breach
- **Pass Criteria**: Permissions enforced

---

### 3.4 Streaming & Real-time Updates

**Test Case 3.4.1: Response Streaming**
- **Objective**: Test Server-Sent Events streaming
- **Steps**:
  1. Send message requiring long response
  2. Observe response delivery
- **Expected Results**:
  - Response streams in chunks (if implemented)
  - Or full response after processing
  - Typing indicator during processing
  - Smooth UI updates
- **Pass Criteria**: Streaming works (if implemented)

**Test Case 3.4.2: Long-Running Operations**
- **Objective**: Test extended processing tasks
- **Steps**:
  1. Request: "Analyze all documents in folder"
  2. Observe progress indication
- **Expected Results**:
  - User informed of processing
  - Progress updates (if implemented)
  - Eventually completes or times out
  - Clear completion message
- **Pass Criteria**: Long operations handled

---

## 4. Security Testing

### 4.1 API Key Protection

**Test Case 4.1.1: API Key Not Exposed**
- **Objective**: Verify OpenAI API key never sent to frontend
- **Steps**:
  1. Open browser DevTools
  2. Monitor all network requests
  3. Use voice and text features
  4. Search for API key in requests
- **Expected Results**:
  - API key never in request headers
  - API key never in request body
  - API key never in response
  - Only server-side API calls
- **Pass Criteria**: API key never exposed

**Test Case 4.1.2: Environment Variables**
- **Objective**: Test .env file security
- **Steps**:
  1. Verify .env not in git repository
  2. Verify .env not served by web server
  3. Request: `GET http://localhost:8000/.env`
- **Expected Results**:
  - .env in .gitignore
  - HTTP 404 when requesting .env
  - API key only in backend process
- **Pass Criteria**: .env protected

---

### 4.2 File System Security

**Test Case 4.2.1: Directory Traversal Prevention**
- **Objective**: Test path traversal attack prevention
- **Steps**:
  1. Request: "List files in ../../../etc"
  2. Request: "Read ../../../../etc/passwd"
  3. Verify access denied
- **Expected Results**:
  - Path traversal blocked
  - Only allowed directories accessible
  - Error message returned
  - Security log entry created
- **Pass Criteria**: Traversal prevented

**Test Case 4.2.2: Temp File Cleanup**
- **Objective**: Verify audio files deleted after use
- **Steps**:
  1. Record and transcribe audio
  2. Check `/tmp/wesign-assistant` directory
  3. Wait 1 minute and check again
- **Expected Results**:
  - Temp file created during processing
  - File deleted immediately after transcription
  - No orphaned files accumulate
  - Directory remains clean
- **Pass Criteria**: All temp files cleaned up

**Test Case 4.2.3: File Permission Restrictions**
- **Objective**: Test filesystem MCP permissions
- **Steps**:
  1. Request: "Delete all files in Documents"
  2. Request: "Write to /etc/hosts"
  3. Verify restrictions
- **Expected Results**:
  - Dangerous operations blocked or require confirmation
  - Only allowed operations permitted
  - Clear permission error messages
- **Pass Criteria**: Permissions enforced

---

### 4.3 Input Validation & Sanitization

**Test Case 4.3.1: XSS Prevention**
- **Objective**: Test cross-site scripting protection
- **Steps**:
  1. Send: `<script>alert('XSS')</script>`
  2. Send: `<img src=x onerror=alert('XSS')>`
  3. Verify no execution
- **Expected Results**:
  - Scripts not executed
  - HTML properly escaped
  - Message displayed as text
  - No JavaScript execution
- **Pass Criteria**: XSS prevented

**Test Case 4.3.2: SQL Injection Prevention**
- **Objective**: Test SQL injection protection (if DB used)
- **Steps**:
  1. Send: `'; DROP TABLE users; --`
  2. Send: `' OR '1'='1`
  3. Verify no database corruption
- **Expected Results**:
  - Input treated as text
  - No SQL execution
  - Database unaffected
- **Pass Criteria**: SQL injection prevented

**Test Case 4.3.3: Command Injection Prevention**
- **Objective**: Test command injection protection
- **Steps**:
  1. Request: "List files in `rm -rf /`"
  2. Request: "Read file.txt; cat /etc/passwd"
  3. Verify no command execution
- **Expected Results**:
  - Shell commands not executed
  - Input sanitized
  - Safe processing only
- **Pass Criteria**: Command injection prevented

---

### 4.4 Session Security

**Test Case 4.4.1: Token Randomness**
- **Objective**: Verify session tokens cryptographically secure
- **Steps**:
  1. Generate 1000 tokens
  2. Analyze distribution and entropy
  3. Check for patterns
- **Expected Results**:
  - All tokens unique
  - High entropy
  - No predictable patterns
  - Using secrets.token_urlsafe(32)
- **Pass Criteria**: Secure token generation

**Test Case 4.4.2: Session Isolation**
- **Objective**: Test session data isolation
- **Steps**:
  1. Create two sessions with different users
  2. Verify no data leakage between sessions
  3. Check conversation context separation
- **Expected Results**:
  - Each session independent
  - No cross-session data access
  - Proper user context per session
- **Pass Criteria**: Sessions isolated

---

## 5. Performance Testing

### 5.1 Response Time Testing

**Test Case 5.1.1: Text Chat Latency**
- **Objective**: Measure text message response time
- **Steps**:
  1. Send simple message: "Hello"
  2. Measure time to response
  3. Repeat 10 times
  4. Calculate average
- **Expected Results**:
  - Average latency <2 seconds
  - Consistent response times
  - No degradation over time
- **Pass Criteria**: Acceptable latency

**Test Case 5.1.2: Transcription Latency**
- **Objective**: Measure voice transcription time
- **Steps**:
  1. Record 5-second audio clip
  2. Measure time to transcription
  3. Repeat 10 times
  4. Calculate average
- **Expected Results**:
  - Average latency <3 seconds
  - Includes upload + API + response
  - Acceptable user experience
- **Pass Criteria**: Transcription <5 seconds

**Test Case 5.1.3: End-to-End Voice Latency**
- **Objective**: Measure complete voice → response cycle
- **Steps**:
  1. Record 5-second audio
  2. Measure time to AI response
  3. Include transcription + chat processing
- **Expected Results**:
  - Total latency <10 seconds
  - User perceives as responsive
  - No frustrating delays
- **Pass Criteria**: Full cycle <15 seconds

---

### 5.2 Concurrency Testing

**Test Case 5.2.1: Multiple Concurrent Users**
- **Objective**: Test load with many simultaneous users
- **Steps**:
  1. Simulate 50 concurrent users
  2. All sending messages simultaneously
  3. Monitor server performance
- **Expected Results**:
  - All requests processed
  - No dropped connections
  - Response times remain acceptable
  - No server crash
- **Pass Criteria**: Handles 50+ concurrent users

**Test Case 5.2.2: Parallel Transcription Requests**
- **Objective**: Test multiple transcriptions at once
- **Steps**:
  1. Send 10 transcription requests simultaneously
  2. Monitor processing
  3. Verify all complete
- **Expected Results**:
  - All requests queued and processed
  - No file conflicts
  - All temp files cleaned up
  - Reasonable processing time
- **Pass Criteria**: Parallel processing works

---

### 5.3 Resource Usage Testing

**Test Case 5.3.1: Memory Usage**
- **Objective**: Monitor memory consumption
- **Steps**:
  1. Start server and note memory usage
  2. Process 100 messages
  3. Process 50 transcriptions
  4. Monitor memory over time
- **Expected Results**:
  - Stable memory usage
  - No memory leaks
  - Garbage collection working
  - Memory returns to baseline
- **Pass Criteria**: No memory leaks

**Test Case 5.3.2: CPU Usage**
- **Objective**: Monitor CPU consumption
- **Steps**:
  1. Monitor CPU during idle
  2. Monitor CPU during heavy load
  3. Verify returns to normal after load
- **Expected Results**:
  - Idle: low CPU usage
  - Load: reasonable CPU increase
  - Returns to baseline after load
- **Pass Criteria**: Reasonable CPU usage

**Test Case 5.3.3: Disk Space**
- **Objective**: Monitor disk space for temp files
- **Steps**:
  1. Process 100 transcriptions
  2. Check `/tmp/wesign-assistant` size
  3. Verify cleanup
- **Expected Results**:
  - Temp directory remains small
  - Old files deleted
  - No disk space exhaustion
- **Pass Criteria**: Disk space managed

---

### 5.4 Scalability Testing

**Test Case 5.4.1: Extended Runtime**
- **Objective**: Test stability over long periods
- **Steps**:
  1. Run server continuously for 24 hours
  2. Send messages periodically
  3. Monitor for degradation
- **Expected Results**:
  - Server remains stable
  - No performance degradation
  - No resource exhaustion
  - No crashes or errors
- **Pass Criteria**: 24+ hour uptime

**Test Case 5.4.2: High Message Volume**
- **Objective**: Test processing many messages
- **Steps**:
  1. Send 1000 messages in sequence
  2. Monitor processing
  3. Verify all handled correctly
- **Expected Results**:
  - All messages processed
  - No queue overflow
  - Consistent performance
  - No data loss
- **Pass Criteria**: Handles 1000+ messages

---

## 6. Browser Compatibility Testing

### 6.1 Desktop Browsers

**Test Case 6.1.1: Chrome Testing**
- **Objective**: Test in Google Chrome
- **Steps**:
  1. Open UI in Chrome (latest version)
  2. Test all features
  3. Check developer console
- **Expected Results**:
  - All features work
  - No console errors
  - Smooth performance
  - MediaRecorder supported
- **Pass Criteria**: Full functionality in Chrome

**Test Case 6.1.2: Firefox Testing**
- **Objective**: Test in Mozilla Firefox
- **Steps**:
  1. Open UI in Firefox (latest version)
  2. Test all features
  3. Check developer console
- **Expected Results**:
  - All features work
  - No console errors
  - MediaRecorder supported
  - Comparable to Chrome
- **Pass Criteria**: Full functionality in Firefox

**Test Case 6.1.3: Safari Testing**
- **Objective**: Test in Apple Safari
- **Steps**:
  1. Open UI in Safari (14.1+)
  2. Test voice recording
  3. Test chat functionality
- **Expected Results**:
  - All features work
  - MediaRecorder supported (Safari 14.1+)
  - Microphone permissions work
  - Acceptable performance
- **Pass Criteria**: Full functionality in Safari

**Test Case 6.1.4: Edge Testing**
- **Objective**: Test in Microsoft Edge
- **Steps**:
  1. Open UI in Edge (Chromium-based)
  2. Test all features
  3. Verify compatibility
- **Expected Results**:
  - All features work
  - Similar behavior to Chrome
  - No Edge-specific issues
- **Pass Criteria**: Full functionality in Edge

---

### 6.2 Mobile Browsers

**Test Case 6.2.1: iOS Safari**
- **Objective**: Test on iPhone/iPad Safari
- **Steps**:
  1. Open UI on iOS device (14.3+)
  2. Test voice recording
  3. Test chat on touchscreen
- **Expected Results**:
  - Responsive design works
  - Voice recording works (iOS 14.3+)
  - Touch interactions smooth
  - Microphone permissions work
- **Pass Criteria**: Mobile functionality on iOS

**Test Case 6.2.2: Android Chrome**
- **Objective**: Test on Android Chrome
- **Steps**:
  1. Open UI on Android device
  2. Test all features
  3. Verify mobile experience
- **Expected Results**:
  - Responsive design adapts
  - Voice recording works
  - Touch-friendly buttons
  - Good performance
- **Pass Criteria**: Mobile functionality on Android

**Test Case 6.2.3: Mobile Orientation**
- **Objective**: Test portrait vs landscape
- **Steps**:
  1. Test in portrait mode
  2. Rotate to landscape
  3. Verify UI adapts
- **Expected Results**:
  - UI responsive to orientation
  - All features accessible
  - No layout breaking
- **Pass Criteria**: Orientation handling

---

### 6.3 Accessibility

**Test Case 6.3.1: Keyboard Navigation**
- **Objective**: Test using keyboard only
- **Steps**:
  1. Navigate UI using Tab key
  2. Use Enter to send messages
  3. Verify all features accessible
- **Expected Results**:
  - All interactive elements reachable
  - Logical tab order
  - Enter key sends message
  - Keyboard shortcuts work
- **Pass Criteria**: Full keyboard accessibility

**Test Case 6.3.2: Screen Reader Compatibility**
- **Objective**: Test with screen reader
- **Steps**:
  1. Enable screen reader (VoiceOver/NVDA)
  2. Navigate interface
  3. Verify announcements
- **Expected Results**:
  - Elements properly labeled
  - Status changes announced
  - Meaningful ARIA attributes
  - Usable with screen reader
- **Pass Criteria**: Screen reader compatible

**Test Case 6.3.3: Color Contrast**
- **Objective**: Test visual accessibility
- **Steps**:
  1. Check color contrast ratios
  2. Test with color blindness simulator
  3. Verify readability
- **Expected Results**:
  - WCAG AA contrast ratios met
  - Text readable
  - Not relying only on color
- **Pass Criteria**: Accessible color usage

---

## 7. Error Recovery Testing

### 7.1 Backend Failure Recovery

**Test Case 7.1.1: Backend Restart During Use**
- **Objective**: Test recovery from backend crash
- **Steps**:
  1. Start conversation
  2. Stop backend server
  3. Restart backend
  4. Try sending message
- **Expected Results**:
  - Frontend detects disconnection
  - User informed of issue
  - Reconnects when backend returns
  - Can continue conversation
- **Pass Criteria**: Graceful recovery

**Test Case 7.1.2: AutoGen Agent Failure**
- **Objective**: Test handling of agent errors
- **Steps**:
  1. Trigger agent error (invalid tool call)
  2. Observe error handling
  3. Verify recovery
- **Expected Results**:
  - Error caught and logged
  - User-friendly error message
  - Conversation can continue
  - No system crash
- **Pass Criteria**: Agent errors handled

---

### 7.2 API Failure Recovery

**Test Case 7.2.1: Whisper API Timeout**
- **Objective**: Test handling of API timeouts
- **Steps**:
  1. Simulate slow/timeout from OpenAI
  2. Observe timeout handling
  3. Verify user notification
- **Expected Results**:
  - Timeout detected
  - User informed
  - Can retry operation
  - No hanging requests
- **Pass Criteria**: Timeouts handled

**Test Case 7.2.2: Whisper API Error**
- **Objective**: Test handling of API errors
- **Steps**:
  1. Trigger Whisper API error (corrupted audio)
  2. Observe error handling
  3. Check logs
- **Expected Results**:
  - Error caught and logged
  - Detailed error message
  - Temp file cleaned up
  - User can retry
- **Pass Criteria**: API errors handled

---

## 8. Automated Test Scripts

### 8.1 Backend API Tests

```bash
#!/bin/bash
# backend-api-tests.sh

echo "🧪 Running Backend API Tests..."
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
curl -s http://localhost:8000/health | jq .status
echo ""

# Test 2: Session Creation
echo "Test 2: Session Creation"
curl -s -X POST http://localhost:8000/api/chatkit/session \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","companyId":"test","userName":"Test"}' | jq .client_secret
echo ""

# Test 3: Chat Endpoint
echo "Test 3: Chat Endpoint"
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","context":{"userId":"test"}}' | jq .response
echo ""

# Test 4: Speech-to-Text Endpoint (requires audio file)
echo "Test 4: Speech-to-Text Endpoint Availability"
curl -s -X POST http://localhost:8000/api/speech-to-text \
  -w "\nHTTP Status: %{http_code}\n" 2>&1 | head -5
echo ""

echo "✅ Backend API Tests Complete"
```

### 8.2 Playwright E2E Tests

```javascript
// e2e-tests.spec.js
const { test, expect } = require('@playwright/test');

test.describe('WeSign AI Assistant E2E Tests', () => {

  test('should load UI successfully', async ({ page }) => {
    await page.goto('http://localhost:8000/ui');
    await expect(page.locator('h1')).toContainText('WeSign AI Assistant');
    await expect(page.locator('#message-input')).toBeVisible();
    await expect(page.locator('#voice-button')).toBeVisible();
  });

  test('should send text message', async ({ page }) => {
    await page.goto('http://localhost:8000/ui');
    await page.fill('#message-input', 'Hello, test message');
    await page.click('#send-button');

    // Wait for response
    await page.waitForSelector('.message.assistant', { timeout: 10000 });

    // Verify message appeared
    const userMessage = page.locator('.message.user').last();
    await expect(userMessage).toContainText('Hello, test message');

    // Verify response appeared
    const assistantMessage = page.locator('.message.assistant').last();
    await expect(assistantMessage).toBeVisible();
  });

  test('should show voice recording button', async ({ page, context }) => {
    // Grant microphone permission
    await context.grantPermissions(['microphone']);

    await page.goto('http://localhost:8000/ui');

    const voiceButton = page.locator('#voice-button');
    await expect(voiceButton).toBeVisible();
    await expect(voiceButton).toContainText('🎤');
  });

  test('should display backend health status', async ({ page }) => {
    await page.goto('http://localhost:8000/ui');

    // Check status indicator
    const statusIndicator = page.locator('.status-indicator');
    await expect(statusIndicator).toBeVisible();

    // Check connection message
    await expect(page.locator('.footer')).toContainText('Connected');
  });

  test('should handle empty message', async ({ page }) => {
    await page.goto('http://localhost:8000/ui');

    // Try to send empty message
    await page.click('#send-button');

    // Should not create any new message
    const messageCount = await page.locator('.message').count();
    // Only welcome message should exist
    expect(messageCount).toBe(1);
  });
});
```

---

## 9. Test Execution Plan

### 9.1 Test Phases

**Phase 1: Smoke Testing** (30 minutes)
- Basic server startup
- Health endpoints
- UI loads correctly
- Text chat works
- Voice button appears

**Phase 2: Feature Testing** (2 hours)
- All functional tests (sections 1.1-1.6)
- Voice recording and transcription
- Session management
- Agent routing

**Phase 3: Edge Case Testing** (2 hours)
- All edge case tests (section 2)
- Error scenarios
- Boundary conditions
- Network issues

**Phase 4: Integration Testing** (1 hour)
- End-to-end workflows
- Multi-agent collaboration
- MCP tool integration

**Phase 5: Security Testing** (1 hour)
- API key protection
- File system security
- Input validation

**Phase 6: Performance Testing** (1 hour)
- Response times
- Concurrent users
- Resource usage

**Phase 7: Browser Compatibility** (1 hour)
- Chrome, Firefox, Safari, Edge
- Mobile browsers
- Accessibility

**Phase 8: Automated Testing** (30 minutes)
- Run automated scripts
- E2E Playwright tests

**Total Estimated Time**: 9 hours

---

### 9.2 Test Environment Setup

**Prerequisites**:
1. Backend server running: `python orchestrator/main.py`
2. Valid OPENAI_API_KEY in `.env`
3. Required browsers installed
4. Playwright configured
5. Audio recording device available

**Test Data**:
- Sample audio files (various formats)
- Test documents (PDF, DOCX)
- Various file sizes (small, large, oversized)
- Corrupted files for error testing

---

### 9.3 Test Reporting

**For Each Test Case, Document**:
- Test ID
- Test name
- Date/time executed
- Tester name
- Result (Pass/Fail)
- Actual behavior vs expected
- Screenshots (if applicable)
- Logs and error messages
- Environment details

**Test Summary Report Should Include**:
- Total tests executed
- Pass/fail counts
- Critical issues found
- Performance metrics
- Browser compatibility matrix
- Security findings
- Recommendations

---

## 10. Success Criteria

**The system is considered ready for deployment when**:

1. **Functional Requirements** (100% pass)
   - ✅ All text chat features working
   - ✅ Voice recording and transcription working
   - ✅ Session management working
   - ✅ All agents routing correctly
   - ✅ MCP tools executing properly

2. **Edge Cases** (95%+ pass)
   - ✅ Error handling working
   - ✅ Network failures handled gracefully
   - ✅ Boundary conditions handled
   - ✅ No critical edge case failures

3. **Security** (100% pass)
   - ✅ No API key exposure
   - ✅ No XSS vulnerabilities
   - ✅ Directory traversal prevented
   - ✅ All security tests pass

4. **Performance** (acceptable metrics)
   - ✅ Text response <2s average
   - ✅ Transcription <5s average
   - ✅ Handles 50+ concurrent users
   - ✅ No memory leaks

5. **Browser Compatibility** (major browsers)
   - ✅ Works in Chrome, Firefox, Safari, Edge
   - ✅ Mobile functionality on iOS/Android
   - ✅ Accessibility standards met

6. **Integration** (100% pass)
   - ✅ End-to-end workflows complete
   - ✅ Multi-agent orchestration working
   - ✅ All MCP servers integrated

---

## 11. Known Limitations & Notes

1. **Official ChatKit Integration**:
   - OpenAI's official ChatKit requires OpenAI-hosted service
   - Domain verification needed for production use
   - Currently experimental, custom UI is primary interface

2. **Voice Quality**:
   - Transcription accuracy depends on audio quality
   - Background noise may affect results
   - Very short recordings may not transcribe well

3. **Browser Support**:
   - MediaRecorder requires modern browser
   - iOS requires 14.3+ for voice support
   - HTTPS required for microphone (except localhost)

4. **Performance**:
   - Whisper API latency varies (typically 2-5 seconds)
   - Concurrent transcriptions may queue
   - Large audio files take longer to process

5. **File System**:
   - Limited to configured allowed directories
   - Some operations require explicit permissions
   - Path traversal prevented (by design)

---

## 12. Next Steps After Testing

1. **Document Findings**
   - Create detailed test report
   - Log all issues found
   - Prioritize fixes (critical, high, medium, low)

2. **Address Critical Issues**
   - Fix any security vulnerabilities immediately
   - Resolve blocking functionality issues
   - Patch critical bugs

3. **Performance Optimization**
   - Optimize slow operations
   - Implement caching if beneficial
   - Tune resource usage

4. **User Acceptance Testing**
   - Deploy to staging environment
   - Conduct UAT with real users
   - Gather feedback

5. **Production Preparation**
   - Update documentation
   - Prepare deployment scripts
   - Configure monitoring and alerting
   - Plan rollout strategy

6. **Post-Deployment Monitoring**
   - Monitor error rates
   - Track performance metrics
   - Collect user feedback
   - Iterate and improve

---

## Conclusion

This comprehensive testing plan covers all aspects of the WeSign AI Assistant with voice-to-text functionality. Following this plan systematically will ensure:

- All features work as designed
- Edge cases are handled gracefully
- Security is maintained
- Performance is acceptable
- User experience is smooth
- System is production-ready

**Estimated Total Testing Time**: 9 hours
**Recommended Test Frequency**: Before each release
**Automated Tests**: Run on every commit

---

**Document Version**: 1.0
**Last Updated**: October 27, 2025
**Author**: WeSign Development Team
**Status**: Ready for Execution
