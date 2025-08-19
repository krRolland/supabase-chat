// Supabase database operations for the chatbot edge function

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { config, APP_CONFIG } from './config.ts'
import type { DatabaseMessage, SessionArtifact, ArtifactInfo } from './types.ts'

// Initialize Supabase client
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)

// Get or create chat session
export async function getOrCreateSession(userId: string, projectId?: string, sessionId?: string): Promise<string> {
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
      session_type: APP_CONFIG.defaultSessionType,
      title: APP_CONFIG.defaultSessionTitle
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
  }

  return newSession.id
}

// Get chat history for context (excludes artifact messages)
export async function getChatHistory(sessionId: string, limit: number = APP_CONFIG.chatHistoryLimit): Promise<DatabaseMessage[]> {
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_artifact', false) // Only get text messages for context
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to get chat history: ${error.message}`)
  }

  return (messages || []).reverse() // Reverse to get chronological order
}

// Save message to database
export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  messageType: string = 'conversation',
  structuredOutput?: any,
  isArtifact: boolean = false,
  artifactId?: string
): Promise<string> {
  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      message_type: messageType,
      structured_output: structuredOutput,
      is_artifact: isArtifact,
      artifact_id: artifactId
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`)
  }

  return message.id
}

// Get existing artifacts for session context
export async function getSessionArtifacts(sessionId: string): Promise<SessionArtifact[]> {
  try {
    const { data: artifacts, error } = await supabase
      .from('artifacts')
      .select('id, template_name, version, template_data')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to get session artifacts:', error)
      return []
    }

    return artifacts || []
  } catch (e) {
    console.error('Error in getSessionArtifacts:', e)
    return []
  }
}

// Enhanced artifact saving with versioning
export async function saveArtifact(
  sessionId: string,
  messageId: string,
  templateData: any,
  artifactType: string = APP_CONFIG.defaultArtifactType
): Promise<ArtifactInfo> {
  try {
    const templateName = templateData.title || `${artifactType}_${Date.now()}`
    const artifactId = templateData.artifact_id

    // Check if this is an update to existing artifact
    if (artifactId && artifactId !== 'new') {
      // Mark existing artifact as inactive
      await supabase
        .from('artifacts')
        .update({ is_active: false })
        .eq('id', artifactId)
        .eq('session_id', sessionId)

      // Get the current version
      const { data: existingArtifact } = await supabase
        .from('artifacts')
        .select('version')
        .eq('id', artifactId)
        .eq('session_id', sessionId)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      const newVersion = (existingArtifact?.version || 0) + 1

      // Create new version with same ID
      const { error } = await supabase
        .from('artifacts')
        .insert({
          id: artifactId, // Keep same ID for versioning
          session_id: sessionId,
          message_id: messageId,
          template_data: templateData,
          template_name: templateName,
          version: newVersion,
          is_active: true
        })

      if (error) {
        console.error('Failed to update artifact:', error)
        throw new Error(`Failed to update artifact: ${error.message}`)
      }

      console.log(`Successfully updated artifact: ${templateName} (v${newVersion})`)
      return { id: artifactId, action: 'updated', version: newVersion, template_name: templateName }
    } else {
      // Create new artifact
      const { data: newArtifact, error } = await supabase
        .from('artifacts')
        .insert({
          session_id: sessionId,
          message_id: messageId,
          template_data: templateData,
          template_name: templateName,
          version: 1,
          is_active: true
        })
        .select('id')
        .single()

      if (error) {
        console.error('Failed to create artifact:', error)
        throw new Error(`Failed to create artifact: ${error.message}`)
      }

      console.log(`Successfully created artifact: ${templateName} (v1)`)
      return { id: newArtifact.id, action: 'created', version: 1, template_name: templateName }
    }
  } catch (e) {
    console.error('Error in saveArtifact:', e)
    throw e
  }
}

// Get project context
export async function getProjectContext(projectId: string, userId: string): Promise<any> {
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()
  
  return project
}

// Get chat sessions for user
export async function getChatSessions(userId: string): Promise<any[]> {
  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select(`
      id,
      title,
      session_type,
      created_at,
      updated_at,
      project_id,
      projects(name)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get chat list: ${error.message}`)
  }

  // Get message counts for each session
  const sessionsWithCounts = await Promise.all(
    (sessions || []).map(async (session) => {
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id)

      return {
        id: session.id,
        title: session.title || 'Untitled Chat',
        type: session.session_type,
        project_name: session.projects?.name || null,
        message_count: count || 0,
        created_at: session.created_at,
        updated_at: session.updated_at
      }
    })
  )

  return sessionsWithCounts
}

// Get chat history with session info
export async function getChatHistoryWithSession(userId: string, sessionId: string): Promise<any> {
  if (!sessionId) {
    throw new Error('session_id required')
  }

  // First verify user owns this session
  const { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .select(`
      id,
      title,
      session_type,
      created_at,
      project_id,
      projects(name)
    `)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (sessionError || !session) {
    throw new Error('Chat not found')
  }

  // Get all messages for this session with artifact information
  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select(`
      id, 
      role, 
      content, 
      structured_output, 
      message_type, 
      is_artifact, 
      artifact_id, 
      created_at,
      artifacts(id, template_name, template_data, version, is_active)
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    throw new Error(`Failed to get chat history: ${messagesError.message}`)
  }

  return {
    session: {
      id: session.id,
      title: session.title,
      type: session.session_type,
      project_name: session.projects?.name || null,
      created_at: session.created_at
    },
    messages: messages || []
  }
}
