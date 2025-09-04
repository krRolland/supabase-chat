// Database utilities for edge functions

import { supabase } from './auth.ts'
import { APP_CONFIG } from './config.ts'
import type { DatabaseMessage, SessionArtifact, ProjectContext } from './types.ts'

// Token estimation utilities for memory management
export function estimateTokens(text: string): number {
  if (!text) return 0
  // Conservative estimation: ~3.5 chars per token for mixed content
  // This accounts for punctuation, spaces, and varied text types
  return Math.ceil(text.length / 3.5)
}

export function estimateMessageTokens(message: DatabaseMessage): number {
  const contentTokens = estimateTokens(message.content || '')
  // Add overhead for role, formatting, metadata, etc.
  const overhead = 10
  return contentTokens + overhead
}

// Get chat history with token-based limiting
export async function getChatHistoryByTokens(sessionId: string): Promise<DatabaseMessage[]> {
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get chat history: ${error.message}`)
  }

  // Use token-based memory management
  const tokenLimit = APP_CONFIG.chatHistoryTokenLimit
  let totalTokens = 0
  const filteredMessages: DatabaseMessage[] = []

  // Process messages in reverse order (newest first) to keep recent context
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    const messageTokens = estimateMessageTokens(message)
    
    if (totalTokens + messageTokens > tokenLimit) {
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
