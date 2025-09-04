// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Import modules
import { validateConfig } from './config.ts'
import { getCorsHeaders, createErrorResponse, authenticateUser, handleQuestionReword } from './handlers.ts'
import type { QuestionRewordRequest } from './types.ts'

// Validate configuration on startup
validateConfig()

// Main handler
Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: getCorsHeaders(origin),
      })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405, undefined, origin)
    }

    // Authenticate user
    const authHeader = req.headers.get('authorization')
    let user
    try {
      user = await authenticateUser(authHeader)
    } catch (error) {
      return createErrorResponse(error.message, 401, undefined, origin)
    }

    // Parse request body
    let body: QuestionRewordRequest
    try {
      body = await req.json()
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', 400, undefined, origin)
    }

    // Validate required fields
    if (!body.session_id) {
      return createErrorResponse('session_id is required', 400, undefined, origin)
    }

    if (!body.artifact_id) {
      return createErrorResponse('artifact_id is required', 400, undefined, origin)
    }

    if (!body.question_text) {
      return createErrorResponse('question_text is required', 400, undefined, origin)
    }

    // Handle question rewriting
    return await handleQuestionReword(user.id, body, origin)

  } catch (error) {
    console.error('Question rewriter error:', error)
    
    return createErrorResponse('Internal server error', 500, error.message, origin)
  }
})
