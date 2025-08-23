// Request handlers for the chatbot edge function

import { supabase, getChatSessions, getChatHistoryWithSession, getOrCreateSession, getChatHistory, saveMessage, getSessionArtifacts, saveArtifact, getProjectContext, updateSessionTitle, isNewSession, deleteChatSession, updateArtifactData } from './supabase.ts'
import { createResponse, createErrorResponse, extractArtifact, generateSystemPrompt, cleanTextContent } from './utils.ts'
import { callClaude, generateConversationTitle } from './claude.ts'
import type { ChatRequest, ChatResponse, ProjectContext } from './types.ts'

// Handle chat list functionality
export async function handleChatList(userId: string): Promise<Response> {
  try {
    const sessionsWithCounts = await getChatSessions(userId)
    return createResponse({ chats: sessionsWithCounts })
  } catch (error) {
    throw new Error(`Failed to get chat list: ${error.message}`)
  }
}

// Handle chat history functionality
export async function handleChatHistory(userId: string, sessionId: string): Promise<Response> {
  try {
    const chatData = await getChatHistoryWithSession(userId, sessionId)
    return createResponse(chatData)
  } catch (error) {
    if (error.message === 'session_id required') {
      return createErrorResponse('session_id required', 400)
    }
    if (error.message === 'Chat not found') {
      return createErrorResponse('Chat not found', 404)
    }
    throw error
  }
}

// Handle chat deletion functionality
export async function handleChatDelete(userId: string, sessionId: string): Promise<Response> {
  try {
    await deleteChatSession(userId, sessionId)
    return createResponse({ 
      success: true, 
      message: 'Chat deleted successfully',
      session_id: sessionId 
    })
  } catch (error) {
    if (error.message === 'session_id required') {
      return createErrorResponse('session_id required', 400)
    }
    if (error.message === 'Chat not found') {
      return createErrorResponse('Chat not found', 404)
    }
    throw error
  }
}

// Handle main chat message processing
export async function handleChatMessage(userId: string, body: ChatRequest): Promise<Response> {
  try {
    // Get or create session
    const sessionId = await getOrCreateSession(userId, body.project_id, body.session_id)

    // Check if this is a new session before saving any messages
    const isNewChat = await isNewSession(sessionId)

    // Get existing artifacts for context
    const existingArtifacts = await getSessionArtifacts(sessionId)

    // Get project context if available
    let projectContext: ProjectContext | null = null
    if (body.project_id) {
      projectContext = await getProjectContext(body.project_id, userId)
    }

    // Save user message
    await saveMessage(sessionId, 'user', body.message, 'text')

    // Get chat history for context
    const chatHistory = await getChatHistory(sessionId) // Uses default limit from config

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

    // Generate system prompt with project context and existing artifacts
    const systemPrompt = generateSystemPrompt(projectContext || undefined, existingArtifacts)

    // Call Claude
    const claudeResponse = await callClaude(claudeMessages, systemPrompt)

    // Generic JSON detection and extraction for artifacts
    let structuredOutput: any = null
    try {
      structuredOutput = extractArtifact(claudeResponse)
    } catch (e) {
      // If JSON parsing fails, continue without structured output
      console.log('Failed to parse artifact:', e)
    }

    // Split Claude's response into messages
    const messages: ChatResponse['messages'] = []
    
    if (structuredOutput) {
      // Find JSON boundaries more accurately
      const jsonIndex = claudeResponse.indexOf('{')
      const jsonEndIndex = claudeResponse.lastIndexOf('}') + 1
      
      let beforeText = claudeResponse.substring(0, jsonIndex).trim()
      let afterText = claudeResponse.substring(jsonEndIndex).trim()
      
      // Clean the text content
      beforeText = cleanTextContent(beforeText)
      afterText = cleanTextContent(afterText)
      
      // Create text message before artifact (if exists)
      if (beforeText) {
        const beforeMessageId = await saveMessage(
          sessionId, 
          'assistant', 
          beforeText, 
          'text'
        )
        
        messages.push({
          message_id: beforeMessageId,
          type: 'text',
          content: beforeText,
          role: 'assistant',
          created_at: new Date().toISOString(),
          session_id: sessionId
        })
      }
      
      // Save artifact and create artifact message
      try {
        const artifactInfo = await saveArtifact(sessionId, structuredOutput)
        
        // Update the structured output with the real group_id (not "new")
        const updatedStructuredOutput = {
          ...structuredOutput,
          group_id: artifactInfo.id // Replace "new" with actual UUID
        }
        
        const artifactMessageId = await saveMessage(
          sessionId,
          'assistant',
          '', // Empty content for pure artifact message
          'artifact',
          true, // is_artifact = true
          artifactInfo.artifact_id // artifact_id
        )
        
        messages.push({
          message_id: artifactMessageId,
          type: 'artifact',
          content: null,
          role: 'assistant',
          created_at: new Date().toISOString(),
          artifact_data: updatedStructuredOutput, // Send back with real UUID
          artifact_info: {
            id: artifactInfo.id,
            artifact_id: artifactInfo.artifact_id,
            action: artifactInfo.action,
            version: artifactInfo.version,
            title: artifactInfo.title
          },
          session_id: sessionId
        })
        
        console.log(`Created artifact message: ${artifactMessageId} for artifact: ${artifactInfo.id}`)
      } catch (e) {
        console.error('Failed to save artifact:', e)
        // Add error message to response so user knows artifact failed to save
        const errorMessageId = await saveMessage(
          sessionId, 
          'assistant', 
          'I encountered an error while saving the artifact. The content was generated but could not be stored.', 
          'error'
        )
        
        messages.push({
          message_id: errorMessageId,
          type: 'text',
          content: 'I encountered an error while saving the artifact. The content was generated but could not be stored.',
          role: 'assistant',
          created_at: new Date().toISOString(),
          session_id: sessionId
        })
      }
      
      // Create text message after artifact (if exists)
      if (afterText) {
        const afterMessageId = await saveMessage(
          sessionId, 
          'assistant', 
          afterText, 
          'text'
        )
        
        messages.push({
          message_id: afterMessageId,
          type: 'text',
          content: afterText,
          role: 'assistant',
          created_at: new Date().toISOString(),
          session_id: sessionId
        })
      }
    } else {
      // No artifact detected, create single text message with cleaned content
      const cleanedResponse = cleanTextContent(claudeResponse)
      const messageId = await saveMessage(
        sessionId, 
        'assistant', 
        cleanedResponse, 
        'text'
      )
      
      messages.push({
        message_id: messageId,
        type: 'text',
        content: cleanedResponse,
        role: 'assistant',
        created_at: new Date().toISOString(),
        session_id: sessionId
      })
    }

    // Generate title for new sessions (after processing the first message)
    if (isNewChat) {
      try {
        // This was a new session, generate and update the title
        const generatedTitle = await generateConversationTitle(body.message)
        await updateSessionTitle(sessionId, generatedTitle)
        console.log(`Generated title for new session ${sessionId}: "${generatedTitle}"`)
      } catch (titleError) {
        // Don't fail the entire request if title generation fails
        console.error('Failed to generate/update session title:', titleError)
      }
    }

    // Return new multi-message response
    const response: ChatResponse = {
      messages: messages,
      session_id: sessionId,
      total_messages: messages.length
    }

    return createResponse(response)
  } catch (error) {
    console.error('Chat message error:', error)
    throw error
  }
}

// Handle artifact auto-save functionality
export async function handleArtifactAutoSave(
  userId: string, 
  artifactGroupId: string, 
  templateData: any
): Promise<Response> {
  try {
    await updateArtifactData(artifactGroupId, templateData, userId)
    return createResponse({ 
      success: true, 
      message: 'Artifact auto-saved successfully',
      artifact_id: artifactGroupId 
    })
  } catch (error) {
    if (error.message === 'Artifact not found') {
      return createErrorResponse('Artifact not found', 404)
    }
    if (error.message.includes('Unauthorized')) {
      return createErrorResponse('Unauthorized access to artifact', 403)
    }
    throw error
  }
}

// Authentication middleware
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
