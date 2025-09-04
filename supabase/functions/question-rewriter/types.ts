// Type definitions for the question-rewriter edge function

export interface QuestionRewordRequest {
  session_id: string
  artifact_id: string
  question_text: string
  question_id?: string
}

export interface QuestionRewordResponse {
  original_question: string
  suggestions: QuestionSuggestion[]
}

export interface QuestionSuggestion {
  reworded: string
  reasoning: string
  improvement_type: 'bias_reduction' | 'clarity' | 'specificity' | 'engagement' | 'measurability'
  confidence: number
}

export interface DatabaseMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  type: string
  is_artifact: boolean
  artifact_id?: string
  created_at: string
}

export interface SessionArtifact {
  id: string // artifact_group_id
  title: string
  version: number
  template_data: any
}
