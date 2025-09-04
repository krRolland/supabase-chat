// Request handlers for the question-rewriter edge function

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { config, CLAUDE_CONFIG, REWORD_PROMPT_TEMPLATE } from './config.ts'
import type { QuestionRewordRequest, QuestionRewordResponse, QuestionSuggestion, DatabaseMessage, SessionArtifact } from './types.ts'

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)

// CORS headers helper
export function getCorsHeaders(origin?: string | null): HeadersInit {
  const allowedOrigins = [
    'https://panda-poll.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ]
  
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// Error response helper
export function createErrorResponse(message: string, status: number, details?: string, origin?: string | null): Response {
  return new Response(
    JSON.stringify({ 
      error: message,
      details: details || undefined
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(origin),
      },
    }
  )
}

// Success response helper
export function createResponse(data: any, status: number = 200, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin),
    },
  })
}

// Authentication helper
export async function authenticateUser(authHeader: string | null): Promise<any> {
  if (!authHeader) {
    throw new Error('Authorization required')
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (authError || !user) {
    throw new Error('Invalid authorization')
  }

  return user
}

// Get chat history with token-based limiting (reusing chatbot logic)
export async function getChatHistoryByTokens(sessionId: string): Promise<DatabaseMessage[]> {
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get chat history: ${error.message}`)
  }

  // Simple token estimation (roughly 4 characters per token)
  const TOKEN_LIMIT = 8000 // Conservative limit for context
  let totalTokens = 0
  const filteredMessages: DatabaseMessage[] = []

  // Process messages in reverse order (newest first) to keep recent context
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    const messageTokens = Math.ceil(message.content.length / 4)
    
    if (totalTokens + messageTokens > TOKEN_LIMIT) {
      break
    }
    
    totalTokens += messageTokens
    filteredMessages.unshift(message) // Add to beginning to maintain chronological order
  }

  return filteredMessages
}

// Get session artifacts
export async function getSessionArtifacts(sessionId: string): Promise<SessionArtifact[]> {
  const { data: artifacts, error } = await supabase
    .from('artifacts')
    .select('artifact_group_id, title, version, template_data')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get session artifacts: ${error.message}`)
  }

  return artifacts.map(artifact => ({
    id: artifact.artifact_group_id,
    title: artifact.title,
    version: artifact.version,
    template_data: artifact.template_data
  }))
}

// Get specific artifact by ID
export async function getArtifactById(artifactId: string, userId: string): Promise<SessionArtifact | null> {
  const { data: artifact, error } = await supabase
    .from('artifacts')
    .select('artifact_group_id, title, version, template_data, session_id')
    .eq('artifact_group_id', artifactId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      return null
    }
    throw new Error(`Failed to get artifact: ${error.message}`)
  }

  // Verify user has access to this artifact through the session
  const { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('user_id')
    .eq('id', artifact.session_id)
    .single()

  if (sessionError || session.user_id !== userId) {
    throw new Error('Unauthorized access to artifact')
  }

  return {
    id: artifact.artifact_group_id,
    title: artifact.title,
    version: artifact.version,
    template_data: artifact.template_data
  }
}

// Call Claude API for question rewriting
export async function callClaude(prompt: string): Promise<string> {
  const response = await fetch(CLAUDE_CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': CLAUDE_CONFIG.apiVersion
    },
    body: JSON.stringify({
      model: CLAUDE_CONFIG.model,
      max_tokens: CLAUDE_CONFIG.maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// Build the prompt for Claude
export function buildRewordPrompt(
  originalQuestion: string,
  surveyContext: any,
  chatHistory: DatabaseMessage[]
): string {
  // Format survey context
  let surveyContextText = 'No survey context available.'
  if (surveyContext && surveyContext.template_data) {
    const survey = surveyContext.template_data
    surveyContextText = `Survey Title: ${survey.title || 'Untitled Survey'}
Survey Description: ${survey.description || 'No description'}
Total Questions: ${survey.questions ? survey.questions.length : 0}
Survey Type: ${survey.metadata?.survey_type || 'General survey'}`

    if (survey.questions && survey.questions.length > 0) {
      surveyContextText += '\n\nOther questions in this survey:'
      survey.questions.slice(0, 5).forEach((q: any, index: number) => {
        if (q.question !== originalQuestion) {
          surveyContextText += `\n${index + 1}. ${q.question}`
        }
      })
    }
  }

  // Format chat history
  let chatHistoryText = 'No conversation history available.'
  if (chatHistory.length > 0) {
    chatHistoryText = 'Recent conversation context:\n'
    chatHistory.slice(-10).forEach(msg => {
      if (msg.content && msg.content.trim()) {
        chatHistoryText += `${msg.role}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}\n`
      }
    })
  }

  // Replace placeholders in template
  return REWORD_PROMPT_TEMPLATE
    .replace('{ORIGINAL_QUESTION}', originalQuestion)
    .replace('{SURVEY_CONTEXT}', surveyContextText)
    .replace('{CHAT_HISTORY}', chatHistoryText)
}

// Parse Claude's response to extract suggestions
export function parseSuggestions(claudeResponse: string): QuestionSuggestion[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      throw new Error('Invalid response format: missing suggestions array')
    }

    // Validate and clean suggestions
    const validSuggestions: QuestionSuggestion[] = []
    
    for (const suggestion of parsed.suggestions) {
      if (suggestion.reworded && suggestion.reasoning && suggestion.improvement_type) {
        validSuggestions.push({
          reworded: suggestion.reworded.trim(),
          reasoning: suggestion.reasoning.trim(),
          improvement_type: suggestion.improvement_type,
          confidence: typeof suggestion.confidence === 'number' ? suggestion.confidence : 0.8
        })
      }
    }

    // Ensure we have exactly 5 suggestions
    if (validSuggestions.length < 5) {
      console.warn(`Only got ${validSuggestions.length} valid suggestions, expected 5`)
    }

    return validSuggestions.slice(0, 5) // Take first 5 if more than 5
  } catch (error) {
    console.error('Failed to parse Claude response:', error)
    throw new Error('Failed to parse AI response')
  }
}

// Main handler for question rewriting
export async function handleQuestionReword(
  userId: string,
  request: QuestionRewordRequest,
  origin?: string | null
): Promise<Response> {
  try {
    // Get the artifact to understand survey context
    const artifact = await getArtifactById(request.artifact_id, userId)
    if (!artifact) {
      return createErrorResponse('Artifact not found or access denied', 404, undefined, origin)
    }

    // Get chat history for context
    const chatHistory = await getChatHistoryByTokens(request.session_id)

    // Build the prompt for Claude
    const prompt = buildRewordPrompt(request.question_text, artifact, chatHistory)

    // Call Claude
    const claudeResponse = await callClaude(prompt)

    // Parse suggestions from Claude's response
    const suggestions = parseSuggestions(claudeResponse)

    // Build response
    const response: QuestionRewordResponse = {
      original_question: request.question_text,
      suggestions: suggestions
    }

    return createResponse(response, 200, origin)

  } catch (error) {
    console.error('Question reword error:', error)
    
    if (error.message.includes('Unauthorized')) {
      return createErrorResponse('Unauthorized access', 403, undefined, origin)
    }
    
    if (error.message.includes('not found')) {
      return createErrorResponse('Resource not found', 404, undefined, origin)
    }
    
    return createErrorResponse('Internal server error', 500, error.message, origin)
  }
}
