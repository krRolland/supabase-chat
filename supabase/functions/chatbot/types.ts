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
    role: 'user' | 'assistant'
    created_at: string
    artifact_data?: any
    artifact_info?: {
      id: string
      artifact_id: string
      action: 'created'
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
  id: string // This will be the artifact_group_id
  artifact_id: string // The database primary key for this specific version
  action: 'created'
  version: number
  title: string
}

export interface SessionArtifact {
  id: string // artifact_group_id
  title: string
  version: number
  template_data: any
}
