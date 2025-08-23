// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Import modules
import { validateConfig } from './config.ts'
import { getCorsHeaders, createErrorResponse } from './utils.ts'
import { handleChatList, handleChatHistory, handleChatDelete, handleChatMessage, handleArtifactAutoSave, authenticateUser } from './handlers.ts'
import type { ChatRequest } from './types.ts'

// Validate configuration on startup
validateConfig()

// Main handler
Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: getCorsHeaders(),
      })
    }

    // Authenticate user (common for both GET and POST)
    const authHeader = req.headers.get('authorization')
    let user
    try {
      user = await authenticateUser(authHeader)
    } catch (error) {
      return createErrorResponse(error.message, 401)
    }

    // Handle GET requests for chat management
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const action = url.searchParams.get('action')
      const sessionId = url.searchParams.get('session_id')
      
      switch (action) {
        case 'list':
          return await handleChatList(user.id)
        case 'history':
          return await handleChatHistory(user.id, sessionId || '')
        default:
          return createErrorResponse('Invalid action. Use ?action=list or ?action=history&session_id=xxx', 400)
      }
    }

    // Handle DELETE requests for chat deletion
    if (req.method === 'DELETE') {
      const url = new URL(req.url)
      const sessionId = url.searchParams.get('session_id')
      
      if (!sessionId) {
        return createErrorResponse('session_id is required for DELETE requests', 400)
      }
      
      return await handleChatDelete(user.id, sessionId)
    }

    // Handle PUT requests for artifact auto-save
    if (req.method === 'PUT') {
      const url = new URL(req.url)
      const pathParts = url.pathname.split('/')
      
      // Check if this is an artifact auto-save request: /artifacts/{id}/autosave
      if (pathParts.length >= 4 && pathParts[pathParts.length - 3] === 'artifacts' && pathParts[pathParts.length - 1] === 'autosave') {
        const artifactGroupId = pathParts[pathParts.length - 2]
        
        if (!artifactGroupId) {
          return createErrorResponse('Artifact ID is required', 400)
        }
        
        const body = await req.json()
        
        if (!body.template_data) {
          return createErrorResponse('template_data is required', 400)
        }
        
        return await handleArtifactAutoSave(user.id, artifactGroupId, body.template_data)
      }
      
      return createErrorResponse('Invalid PUT endpoint', 400)
    }

    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405)
    }

    // Parse request (POST only at this point)
    const body: ChatRequest = await req.json()
    
    if (!body.message) {
      return createErrorResponse('Message is required', 400)
    }

    // Handle chat message
    return await handleChatMessage(user.id, body)

  } catch (error) {
    console.error('Chatbot error:', error)
    
    return createErrorResponse('Internal server error', 500, error.message)
  }
})
