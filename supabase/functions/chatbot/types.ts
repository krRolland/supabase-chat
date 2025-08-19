// Type definitions for the chatbot edge function

export interface ChatRequest {
  message: string
  session_id?: string
  project_id?: string
  type?: 'conversation' | 'template' | 'analysis' | 'advice'
}

export interface ChatResponse {
  messages: Array<{
    message_id: string
    type: 'text' | 'artifact'
    content: string | null
    artifact_data?: any
    artifact_info?: {
      id: string
      action: 'created' | 'updated'
      version: number
      title: string
    }
    session_id: string
  }>
  session_id: string
  total_messages: number
}

export interface DatabaseMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  structured_output?: any
  type: string
  is_artifact: boolean
  artifact_id?: string
  created_at: string
}

export interface ProjectContext {
  id: string
  name: string
  description: string
  target_audience: string
  research_goals: string[]
}

export interface ArtifactInfo {
  id: string
  action: 'created' | 'updated'
  version: number
  title: string
}

export interface SessionArtifact {
  id: string
  title: string
  version: number
  template_data: any
}
