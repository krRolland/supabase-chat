// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Types for our chatbot
interface ChatRequest {
  message: string
  session_id?: string
  project_id?: string
  message_type?: 'conversation' | 'template' | 'analysis' | 'advice'
}

interface ChatResponse {
  response: string
  session_id: string
  message_id: string
  structured_output?: any
}

interface DatabaseMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  structured_output?: any
  message_type: string
  created_at: string
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Claude API integration
async function callClaude(messages: any[], systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: systemPrompt,
      messages: messages
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// Get or create chat session
async function getOrCreateSession(userId: string, projectId?: string, sessionId?: string): Promise<string> {
  if (sessionId) {
    // Verify session exists and belongs to user
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()
    
    if (session && !error) {
      return sessionId
    }
  }

  // Create new session
  const { data: newSession, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      project_id: projectId,
      session_type: 'general',
      title: 'New Chat Session'
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
  }

  return newSession.id
}

// Get chat history for context
async function getChatHistory(sessionId: string, limit: number = 10): Promise<DatabaseMessage[]> {
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to get chat history: ${error.message}`)
  }

  return (messages || []).reverse() // Reverse to get chronological order
}

// Save message to database
async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  messageType: string = 'conversation',
  structuredOutput?: any
): Promise<string> {
  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      message_type: messageType,
      structured_output: structuredOutput
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`)
  }

  return message.id
}

// Generate system prompt for concept testing
function generateSystemPrompt(projectContext?: any): string {
  const basePrompt = `You are an expert research consultant specializing in concept testing, survey design, and market research methodology. Your role is to help users create effective surveys, analyze results, and improve their research approach.

Key capabilities:
1. Survey Design: Help craft clear, unbiased questions and optimal survey structure
2. Template Generation: Create JSON survey templates that can be parsed by frontend applications
3. Results Analysis: Interpret survey data and provide actionable insights
4. Methodology Advice: Guide users on research best practices and statistical validity

When generating survey templates, use this JSON structure:
{
  "title": "Survey Title",
  "description": "Survey description",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice" | "rating_scale" | "text" | "yes_no" | "ranking",
      "question": "Question text",
      "options": ["Option 1", "Option 2"] // for multiple choice
      "scale": {"min": 1, "max": 5, "labels": {"1": "Poor", "5": "Excellent"}} // for rating scales
    }
  ],
  "metadata": {
    "estimated_time": "5 minutes",
    "target_responses": 100
  }
}

Always provide practical, actionable advice based on research best practices.`

  if (projectContext) {
    return basePrompt + `\n\nProject Context:\n- Name: ${projectContext.name}\n- Description: ${projectContext.description}\n- Target Audience: ${projectContext.target_audience}\n- Research Goals: ${projectContext.research_goals?.join(', ')}`
  }

  return basePrompt
}

// Main handler
Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get user from JWT
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse request
    const body: ChatRequest = await req.json()
    
    if (!body.message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get or create session
    const sessionId = await getOrCreateSession(user.id, body.project_id, body.session_id)

    // Get project context if available
    let projectContext = null
    if (body.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', body.project_id)
        .eq('user_id', user.id)
        .single()
      
      projectContext = project
    }

    // Save user message
    await saveMessage(sessionId, 'user', body.message, body.message_type || 'conversation')

    // Get chat history for context
    const chatHistory = await getChatHistory(sessionId, 8) // Get last 8 messages for context

    // Prepare messages for Claude
    const claudeMessages = chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Add current user message
    claudeMessages.push({
      role: 'user',
      content: body.message
    })

    // Generate system prompt with project context
    const systemPrompt = generateSystemPrompt(projectContext)

    // Call Claude
    const claudeResponse = await callClaude(claudeMessages, systemPrompt)

    // Check if response contains a survey template (simple heuristic)
    let structuredOutput: any = null
    if (claudeResponse.includes('"questions"') && claudeResponse.includes('"title"')) {
      try {
        // Extract JSON from response
        const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          structuredOutput = JSON.parse(jsonMatch[0])
          
          // Save as survey template if it's a valid template
          if (structuredOutput && structuredOutput.questions && structuredOutput.title) {
            await supabase
              .from('survey_templates')
              .insert({
                session_id: sessionId,
                template_data: structuredOutput,
                template_name: structuredOutput.title
              })
          }
        }
      } catch (e) {
        // If JSON parsing fails, continue without structured output
        console.log('Failed to parse structured output:', e)
      }
    }

    // Save assistant response
    const messageId = await saveMessage(
      sessionId, 
      'assistant', 
      claudeResponse, 
      body.message_type || 'conversation',
      structuredOutput
    )

    // Return response
    const response: ChatResponse = {
      response: claudeResponse,
      session_id: sessionId,
      message_id: messageId,
      structured_output: structuredOutput
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })

  } catch (error) {
    console.error('Chatbot error:', error)
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
})
