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

  // Create new session with temporary title
  const { data: newSession, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      project_id: projectId,
      session_type: APP_CONFIG.defaultSessionType,
      title: 'New Chat...' // Temporary title, will be updated after first message
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
  }

  return newSession.id
}

// Update session title
export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({ title: title })
    .eq('id', sessionId)

  if (error) {
    throw new Error(`Failed to update session title: ${error.message}`)
  }
}

// Check if session is new (has only temporary title and no messages)
export async function isNewSession(sessionId: string): Promise<boolean> {
  // Check if session has any messages
  const { count, error } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  if (error) {
    console.error('Error checking session message count:', error)
    return false
  }

  // If no messages exist, it's a new session
  return (count || 0) === 0
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
      type: messageType,
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
    // Get only the latest version of each artifact group
    const { data: artifacts, error } = await supabase
      .from('artifacts')
      .select('artifact_group_id, title, version, template_data')
      .eq('session_id', sessionId)
      .order('artifact_group_id, version', { ascending: false })

    if (error) {
      console.error('Failed to get session artifacts:', error)
      return []
    }

    // Filter to get only the latest version of each group
    const latestVersions = new Map()
    artifacts?.forEach(artifact => {
      const groupId = artifact.artifact_group_id
      if (!latestVersions.has(groupId) || 
          latestVersions.get(groupId).version < artifact.version) {
        latestVersions.set(groupId, artifact)
      }
    })

    return Array.from(latestVersions.values()).map(artifact => ({
      id: artifact.artifact_group_id,
      title: artifact.title,
      version: artifact.version,
      template_data: artifact.template_data
    }))
  } catch (e) {
    console.error('Error in getSessionArtifacts:', e)
    return []
  }
}

// Enhanced artifact saving with versioning using artifact_group_id
export async function saveArtifact(
  sessionId: string,
  templateData: any,
  artifactType: string = APP_CONFIG.defaultArtifactType
): Promise<ArtifactInfo> {
  try {
    const title = templateData.title || `${artifactType}_${Date.now()}`
    const groupId = templateData.group_id

    // Check if this is an update to existing artifact
    if (groupId && groupId !== 'new') {
      // Find the latest version using artifact_group_id
      const { data: latestVersion } = await supabase
        .from('artifacts')
        .select('version, title')
        .eq('artifact_group_id', groupId)
        .eq('session_id', sessionId)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      if (latestVersion) {
        const newVersion = latestVersion.version + 1

        // Create new version with same artifact_group_id
        const { data: newArtifact, error } = await supabase
          .from('artifacts')
          .insert({
            session_id: sessionId,
            artifact_group_id: groupId, // Same group ID
            test_id: null, // Will be set later when linked to test
            template_data: templateData,
            title: title,
            version: newVersion
          })
          .select('id')
          .single()

        if (error) {
          console.error('Failed to update artifact:', error)
          throw new Error(`Failed to update artifact: ${error.message}`)
        }

        console.log(`Successfully updated artifact: ${title} (v${newVersion})`)
        return { 
          id: groupId, // Return the group ID (not database ID)
          artifact_id: newArtifact.id, // Return the database primary key
          action: 'created', 
          version: newVersion, 
          title: title 
        }
      } else {
        // Artifact not found, treat as new
        console.log(`Artifact ${groupId} not found, creating new artifact`)
      }
    }
    
    // Create new artifact (either artifactId is 'new' or existing not found)
    const newArtifactGroupId = crypto.randomUUID()
    
    const { data: newArtifact, error } = await supabase
      .from('artifacts')
      .insert({
        session_id: sessionId,
        artifact_group_id: newArtifactGroupId,
        test_id: null, // Will be set later
        template_data: templateData,
        title: title,
        version: 1
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create artifact:', error)
      throw new Error(`Failed to create artifact: ${error.message}`)
    }

    console.log(`Successfully created artifact: ${title} (v1)`)
    return { 
      id: newArtifactGroupId, // Return the group ID
      artifact_id: newArtifact.id, // Return the database primary key
      action: 'created', 
      version: 1, 
      title: title 
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
  const { data: rawMessages, error: messagesError } = await supabase
    .from('chat_messages')
    .select(`
      id, 
      role, 
      content, 
      structured_output, 
      type, 
      is_artifact, 
      artifact_id, 
      created_at,
      artifacts(id, artifact_group_id, title, template_data, version)
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    throw new Error(`Failed to get chat history: ${messagesError.message}`)
  }

  // Transform messages to match the frontend expected format
  const transformedMessages = (rawMessages || []).map(msg => {
    if (msg.is_artifact && msg.artifacts) {
      // Transform artifact message to match ChatResponse format
      return {
        message_id: msg.id,
        type: 'artifact',
        content: null,
        role: msg.role,
        artifact_data: msg.artifacts.template_data,
        artifact_info: {
          id: msg.artifacts.artifact_group_id,
          artifact_id: msg.artifacts.id,
          action: 'created', // Historical messages are always 'created' in this context
          version: msg.artifacts.version,
          title: msg.artifacts.title
        },
        session_id: sessionId,
        created_at: msg.created_at
      }
    } else {
      // Transform regular text message
      return {
        message_id: msg.id,
        type: 'text',
        content: msg.content,
        session_id: sessionId,
        role: msg.role,
        created_at: msg.created_at
      }
    }
  })

  return {
    session: {
      id: session.id,
      title: session.title,
      type: session.session_type,
      project_name: session.projects?.name || null,
      created_at: session.created_at
    },
    messages: transformedMessages
  }
}
