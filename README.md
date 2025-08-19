# Concept Testing Chatbot - Supabase Edge Function

A specialized Claude-powered chatbot designed for concept testing platforms. This edge function provides expert guidance on survey design, generates JSON survey templates, and helps analyze research results.

## 🚀 Features

- **Expert Survey Design Advice**: Get professional guidance on question wording, survey structure, and research methodology
- **JSON Template Generation**: Automatically generate survey templates that your frontend can parse
- **Chat History**: Persistent conversation history with session management
- **Project Context**: Link conversations to specific projects for personalized advice
- **Results Analysis**: Help interpret survey data and provide actionable insights
- **Structured Outputs**: Automatic detection and storage of survey templates

## 📁 Project Structure

```
supabase/
├── functions/
│   ├── chatbot/
│   │   ├── index.ts          # Main chatbot edge function
│   │   └── deno.json         # Deno configuration
│   └── hello-world/          # Original demo function (can be removed)
├── config.toml               # Supabase configuration
test-chatbot.js               # Test script for the chatbot
README.md                     # This file
```

## 🗄️ Database Schema

The chatbot uses these tables:

- **`projects`**: High-level containers for concept tests
- **`chat_sessions`**: Individual conversation threads
- **`chat_messages`**: Individual messages with role (user/assistant)
- **`survey_templates`**: Generated survey templates with JSON data

## 🔧 Setup Instructions

### 1. Environment Variables

Set these environment variables in your Supabase project:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 2. Deploy the Function

The function is already configured in `supabase/config.toml`. Deploy with:

```bash
supabase functions deploy chatbot
```

### 3. Test the Function

Update the values in `test-chatbot-complete.js` and run:

```bash
node test-chatbot-complete.js
```

This comprehensive test script will verify:
- ✅ Starting new chats
- ✅ Adding messages to existing chats  
- ✅ Getting list of all chats
- ✅ Retrieving chat history
- ✅ Error handling

## 📡 API Usage

### Chat Operations (POST)
```
POST /functions/v1/chatbot
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "apikey": "YOUR_SUPABASE_ANON_KEY"
}
```

**Request Body:**
```json
{
  "message": "Your message to the chatbot",
  "session_id": "optional_existing_session_id",
  "project_id": "optional_project_id",
  "message_type": "conversation" // or "template", "analysis", "advice"
}
```

**Response:**
```json
{
  "response": "Chatbot's text response",
  "session_id": "session_uuid",
  "message_id": "message_uuid",
  "structured_output": {
    // JSON survey template if generated
    "title": "Survey Title",
    "questions": [...],
    "metadata": {...}
  }
}
```

### Chat Management (GET)

#### Get All Chats
```
GET /functions/v1/chatbot?action=list
```

**Response:**
```json
{
  "chats": [
    {
      "id": "session_uuid",
      "title": "Chat Title",
      "type": "general",
      "project_name": "Project Name",
      "message_count": 12,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T11:45:00Z"
    }
  ]
}
```

#### Get Chat History
```
GET /functions/v1/chatbot?action=history&session_id=SESSION_UUID
```

**Response:**
```json
{
  "session": {
    "id": "session_uuid",
    "title": "Chat Title",
    "type": "general",
    "project_name": "Project Name",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "messages": [
    {
      "id": "message_uuid",
      "role": "user",
      "content": "Message content",
      "message_type": "conversation",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## 🎯 Frontend Integration

### Complete Chat Interface Functions

```javascript
// 1. Start a new chat
async function startNewChat(firstMessage, projectId = null) {
  const response = await fetch('/functions/v1/chatbot', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      message: firstMessage,
      project_id: projectId
      // No session_id = creates new chat
    })
  });
  
  return await response.json(); // Returns new session_id
}

// 2. Add message to existing chat
async function addMessageToChat(message, sessionId) {
  const response = await fetch('/functions/v1/chatbot', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      message: message,
      session_id: sessionId
    })
  });
  
  return await response.json();
}

// 3. Get list of all chats
async function getAllChats() {
  const response = await fetch('/functions/v1/chatbot?action=list', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'apikey': supabaseAnonKey
    }
  });
  
  return await response.json();
  // Returns: { chats: [{ id, title, message_count, created_at, ... }] }
}

// 4. Access old chat (get all messages)
async function getChat(sessionId) {
  const response = await fetch(`/functions/v1/chatbot?action=history&session_id=${sessionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'apikey': supabaseAnonKey
    }
  });
  
  return await response.json();
  // Returns: { session: {...}, messages: [...] }
}
```

### Usage Examples

```javascript
// Start a new conversation
const newChat = await startNewChat("Help me create a survey for my app");
console.log("New chat ID:", newChat.session_id);

// Continue the conversation
const response = await addMessageToChat(
  "Can you create a JSON template for user satisfaction questions?", 
  newChat.session_id
);

// Get all user's chats for sidebar
const allChats = await getAllChats();
allChats.chats.forEach(chat => {
  console.log(`${chat.title} (${chat.message_count} messages)`);
});

// Load an old conversation
const oldChat = await getChat("existing-session-uuid");
console.log("Chat history:", oldChat.messages);
```

## 🔒 Security Features

- **JWT Authentication**: All requests require valid user authentication
- **Row Level Security**: Users can only access their own data
- **Input Validation**: Comprehensive request validation and sanitization
- **Error Handling**: Graceful error handling with detailed logging

## 🧠 AI Capabilities

The chatbot is powered by Claude 3.5 Sonnet and specializes in:

- Survey methodology and best practices
- Question wording and bias detection
- Statistical analysis interpretation
- Research design recommendations
- JSON template generation with proper structure

## 📊 Survey Template Format

Generated templates follow this structure:

```json
{
  "title": "Survey Title",
  "description": "Survey description",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["Option 1", "Option 2"]
    },
    {
      "id": "q2",
      "type": "rating_scale",
      "question": "Rate this feature",
      "scale": {
        "min": 1,
        "max": 5,
        "labels": {"1": "Poor", "5": "Excellent"}
      }
    }
  ],
  "metadata": {
    "estimated_time": "5 minutes",
    "target_responses": 100
  }
}
```

## 🚦 Status

- ✅ **Database Schema**: Implemented and tested
- ✅ **Core Chatbot Function**: Complete with Claude integration
- ✅ **Session Management**: Working with persistent history
- ✅ **Template Generation**: Automatic JSON template detection and storage
- ✅ **Project Context**: Support for project-specific conversations
- ✅ **Chat List API**: Get all user's chat sessions
- ✅ **Chat History API**: Retrieve full conversation history
- ✅ **Complete Frontend Integration**: All 4 core functions implemented
- ⏳ **Results Analysis**: Basic implementation (can be enhanced)
- ⏳ **Rate Limiting**: Basic error handling (can be enhanced)
- ⏳ **Fine-tuning Preparation**: Data collection structure in place

## 🔄 Next Steps

1. **Set up Anthropic API key** in Supabase environment variables
2. **Deploy the function** using Supabase CLI
3. **Test with your frontend** integration
4. **Enhance results analysis** capabilities as needed
5. **Implement rate limiting** for production use
6. **Collect feedback data** for future fine-tuning

## 🛠️ Development Notes

- The function uses Deno runtime with TypeScript
- Database operations use Supabase client with RLS policies
- Claude API integration uses the latest Anthropic API format
- Structured output detection uses regex pattern matching
- Chat history is limited to last 8 messages for context window management

## 📝 Safe to Modify

- `test-chatbot.js` - Update with your credentials and test scenarios
- `README.md` - Update documentation as needed
- Environment variables in Supabase dashboard

## ⚠️ Do NOT Modify

- Database schema without careful consideration of existing data
- Core function logic without thorough testing
- Authentication and security implementations
