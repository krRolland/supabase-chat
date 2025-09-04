// Request handlers for the question-rewriter edge function

import { REWORD_PROMPT_TEMPLATE } from './config.ts'
import { authenticateUser } from '../_shared/auth.ts'
import { createResponse, createErrorResponse } from '../_shared/responses.ts'
import { getChatHistoryByTokens, getArtifactById } from '../_shared/database.ts'
import { callClaude } from '../_shared/claude.ts'
import type { QuestionRewordRequest, QuestionRewordResponse, QuestionSuggestion, DatabaseMessage } from './types.ts'

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
  origin?: string
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

    // Call Claude with a lower token limit for question rewriting
    const claudeResponse = await callClaude(prompt, 2000)

    // Parse suggestions from Claude's response
    const suggestions = parseSuggestions(claudeResponse)

    // Build response
    const response: QuestionRewordResponse = {
      original_question: request.question_text,
      suggestions: suggestions
    }

    return createResponse(response, 200, undefined, origin)

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

// Re-export shared functions for the index.ts file
export { authenticateUser } from '../_shared/auth.ts'
export { createErrorResponse } from '../_shared/responses.ts'
export { getCorsHeaders } from '../_shared/cors.ts'
