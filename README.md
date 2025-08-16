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

Update the values in `test-chatbot.js` and run:

```bash
node test-chatbot.js
```

## 📡 API Usage

### Endpoint
```
POST /functions/v1/chatbot
```

### Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "apikey": "YOUR_SUPABASE_ANON_KEY"
}
```

### Request Body
```json
{
  "message": "Your message to the chatbot",
  "session_id": "optional_existing_session_id",
  "project_id": "optional_project_id",
  "message_type": "conversation" // or "template", "analysis", "advice"
}
```

### Response
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

## 🎯 Use Cases

### 1. Survey Design Consultation
```json
{
  "message": "I need help creating questions for testing a new mobile app concept",
  "message_type": "advice"
}
```

### 2. Template Generation
```json
{
  "message": "Create a JSON survey template for user satisfaction with delivery times",
  "message_type": "template"
}
```

### 3. Results Analysis
```json
{
  "message": "Here are my survey results: [data]. What insights can you provide?",
  "message_type": "analysis"
}
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
