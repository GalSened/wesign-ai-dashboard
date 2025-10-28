# WeSign AI Assistant - Voice-to-Text Feature Documentation

## Overview

The WeSign AI Assistant now includes full voice-to-text functionality using OpenAI's Whisper API, allowing users to interact with the AI assistant using voice commands instead of typing.

## Implementation Summary

### Architecture

```
User Voice Input (Browser)
    ↓
MediaRecorder API (JavaScript)
    ↓
Audio Blob (WAV format)
    ↓
POST /api/speech-to-text (FastAPI Backend)
    ↓
OpenAI Whisper API
    ↓
Transcribed Text
    ↓
Chat Input Field (Auto-filled)
    ↓
User Reviews & Sends
    ↓
AutoGen Multi-Agent System
```

## Features Implemented

### 1. Custom ChatKit UI with Voice Support

**File**: `/frontend/chatkit-custom.html`

**Key Features**:
- Beautiful gradient UI matching WeSign brand
- Voice recording button with visual feedback (pulse animation)
- Real-time typing indicators
- Message history with user/assistant distinction
- Auto-scrolling chat interface
- Status indicator showing backend connectivity
- Microphone permissions handling

### 2. Speech-to-Text Backend Endpoint

**File**: `/orchestrator/main.py`

**Endpoint**: `POST /api/speech-to-text`

**Features**:
- Accepts audio file uploads (WAV, MP3, MP4, M4A, MPEG, MPGA, WEBM)
- File size validation (max 25MB per Whisper API limits)
- Temporary file handling with automatic cleanup
- OpenAI Whisper API integration
- Comprehensive error handling and logging

**Request Format**:
```javascript
const formData = new FormData();
formData.append('file', audioBlob, 'recording.wav');

fetch('/api/speech-to-text', {
    method: 'POST',
    body: formData
});
```

**Response Format**:
```json
{
    "text": "Transcribed text from audio",
    "filename": "recording.wav",
    "size": 12345
}
```

### 3. Voice Recording UI Implementation

**JavaScript Functions**:

#### `toggleVoiceRecording()`
Handles starting/stopping audio recording:
- Requests microphone permissions
- Creates MediaRecorder stream
- Captures audio data in chunks
- Sends to transcription endpoint when stopped

#### `transcribeAudio(audioBlob)`
Sends recorded audio to backend:
- Creates FormData with audio blob
- POSTs to `/api/speech-to-text`
- Handles transcription response
- Auto-fills transcribed text into input field

#### Visual Feedback
- 🎤 → ⏹️ button icon change during recording
- Pulse animation on recording button
- Typing indicator during transcription
- Error messages for failures

### 4. Session Management

**Endpoints**:
- `POST /api/chatkit/session` - Creates authenticated session
- `POST /api/chatkit-client-token` - Legacy endpoint for backward compatibility

**Features**:
- Secure token generation using `secrets.token_urlsafe(32)`
- User context storage (userId, companyId, userName)
- Token-based authentication for ChatKit requests

## API Endpoints Summary

### Main Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Service health and version info |
| `/health` | GET | Backend health check with agent status |
| `/ui` or `/chatkit` | GET | Serves custom ChatKit UI with voice support |
| `/official-chatkit.html` | GET | Serves official OpenAI ChatKit UI (experimental) |
| `/api/chat` | POST | Main chat endpoint for text messages |
| `/api/speech-to-text` | POST | Voice-to-text transcription |
| `/api/upload` | POST | File upload for document processing |
| `/api/chatkit/session` | POST | Create ChatKit authentication session |
| `/api/tools` | GET | List available MCP tools |
| `/api/chatkit-status` | GET | ChatKit server statistics |

## User Flow

### Voice Input Flow

1. **User clicks microphone button** 🎤
   - Browser requests microphone permissions
   - MediaRecorder starts capturing audio

2. **User speaks their message**
   - Audio is captured in real-time
   - Recording indicator shows pulse animation

3. **User clicks stop button** ⏹️
   - Recording stops
   - Audio blob is created
   - Typing indicator appears

4. **Audio is transcribed**
   - Audio sent to `/api/speech-to-text`
   - OpenAI Whisper API processes audio
   - Transcribed text returned

5. **Text appears in input field**
   - User can review transcribed text
   - User can edit if needed
   - User clicks send or presses Enter

6. **Message processed by AutoGen**
   - Message routed to appropriate agent
   - Multi-agent orchestration occurs
   - Response streamed back to UI

## Configuration Requirements

### Environment Variables

Required in `/orchestrator/.env`:

```bash
OPENAI_API_KEY=sk-...
HOST=0.0.0.0
PORT=8000
```

### Dependencies

Already included in `requirements.txt`:
```
openai>=1.0.0
fastapi
uvicorn[standard]
python-multipart
```

## Supported Audio Formats

The Whisper API endpoint supports:
- WAV (audio/wav, audio/x-wav, audio/wave)
- MP3 (audio/mpeg, audio/mp3)
- MP4 (audio/mp4)
- M4A (audio/m4a)
- MPEG (audio/mpeg)
- MPGA (audio/mpga)
- WEBM (audio/webm)

**Maximum file size**: 25MB (Whisper API limit)

## Error Handling

### Frontend Errors

1. **Microphone Permission Denied**
   - Alert shown to user
   - User prompted to allow microphone access

2. **Transcription Failed**
   - Error message displayed in chat
   - User can retry or type manually

3. **Backend Connection Failed**
   - Warning message in chat
   - Status indicator shows disconnected state

### Backend Errors

1. **File Too Large**
   - Returns 400 Bad Request
   - Message: "Audio file too large. Maximum size is 25MB."

2. **Empty File**
   - Returns 400 Bad Request
   - Message: "Audio file is empty."

3. **Whisper API Error**
   - Returns 500 Internal Server Error
   - Logs full error with stack trace
   - Message: "Transcription failed: {error details}"

## Security Considerations

### API Key Protection
- OpenAI API key stored in `.env` file
- Never exposed to frontend
- Server-side API calls only

### File Handling
- Temporary files created in isolated directory
- Automatic cleanup after processing
- Path validation prevents directory traversal

### Session Management
- Secure token generation
- Token stored server-side only
- User context tied to token

### Directory Access
- FileSystem MCP limited to allowed directories:
  - `/Users/galsened/Documents`
  - `/Users/galsened/Downloads`
  - `/tmp/wesign-assistant`

## Testing

### Manual Testing Steps

1. **Start the server**:
```bash
cd /Users/galsened/wesign-ai-dashboard/orchestrator
source venv/bin/activate
python main.py
```

2. **Open the UI**:
```
http://localhost:8000/ui
```

3. **Test text chat**:
   - Type a message
   - Click send button
   - Verify AI response

4. **Test voice input**:
   - Click microphone button 🎤
   - Allow microphone access
   - Speak your message
   - Click stop button ⏹️
   - Verify transcribed text appears
   - Review and send

### Automated Testing

The endpoint is available for automated testing:

```bash
# Test endpoint availability
curl -X POST http://localhost:8000/api/speech-to-text \
  -H "Content-Type: multipart/form-data" \
  -w "\nHTTP Status: %{http_code}\n"
```

Note: Full voice testing requires a real browser with microphone access.

## Logging

The backend logs all voice-related events:

```
2025-10-27 15:26:55,539 - main - INFO - 🎤 Transcription request: recording.wav (audio/wav)
2025-10-27 15:26:55,540 - main - INFO - 📊 Audio file size: 123456 bytes
2025-10-27 15:26:55,541 - main - INFO - 💾 Saved temp file: /tmp/wesign-assistant/audio-1761571695.541.wav
2025-10-27 15:26:55,542 - main - INFO - 🔄 Calling OpenAI Whisper API...
2025-10-27 15:26:56,789 - main - INFO - ✅ Transcription successful: Hello, can you help me with...
2025-10-27 15:26:56,790 - main - INFO - 🗑️ Cleaned up temp file: /tmp/wesign-assistant/audio-1761571695.541.wav
```

## Browser Compatibility

The voice feature requires:
- Modern browser with MediaRecorder API support
- HTTPS connection (or localhost for development)
- Microphone permissions

**Supported Browsers**:
- Chrome 47+
- Firefox 25+
- Edge 79+
- Safari 14.1+
- Opera 36+

**Note**: Safari on iOS requires iOS 14.3+ for MediaRecorder support.

## Future Enhancements

Potential improvements for future versions:

1. **Real-time Streaming Transcription**
   - Stream audio chunks during recording
   - Display partial transcriptions in real-time

2. **Language Selection**
   - Allow users to select transcription language
   - Support for multilingual voice input

3. **Voice Activity Detection**
   - Auto-start/stop recording based on speech detection
   - Silence detection for automatic stopping

4. **Audio Quality Controls**
   - Noise cancellation
   - Audio format optimization
   - Sample rate adjustment

5. **Voice Feedback**
   - Text-to-speech for AI responses
   - Full voice conversation mode

6. **Offline Support**
   - Local speech recognition fallback
   - Cached transcriptions

## Troubleshooting

### Common Issues

**Issue**: Microphone button not working
- **Solution**: Ensure HTTPS or localhost connection
- **Solution**: Check browser microphone permissions

**Issue**: "Transcription failed" error
- **Solution**: Verify OPENAI_API_KEY in .env file
- **Solution**: Check audio file format and size
- **Solution**: Review backend logs for detailed error

**Issue**: No audio recorded
- **Solution**: Check system microphone settings
- **Solution**: Test microphone in other applications
- **Solution**: Reload page and allow permissions again

**Issue**: Slow transcription
- **Solution**: Check internet connection speed
- **Solution**: Reduce recording duration
- **Solution**: Verify Whisper API status

## Support

For issues or questions:
1. Check backend logs: `python main.py` output
2. Check browser console: F12 → Console tab
3. Verify configuration in `.env` file
4. Review this documentation

## Version Information

- **Implementation Date**: October 27, 2025
- **Backend Version**: 2.0.0-native-mcp
- **OpenAI SDK Version**: 1.0.0+
- **Whisper Model**: whisper-1
- **AutoGen Version**: 0.7.5

## Credits

- **OpenAI Whisper API**: Speech-to-text transcription
- **AutoGen Framework**: Multi-agent orchestration
- **FastAPI**: Backend web framework
- **MediaRecorder API**: Browser audio capture
