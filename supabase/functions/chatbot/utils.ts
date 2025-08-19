// Utility functions for the chatbot edge function

import { CORS_HEADERS } from './config.ts'
import type { SessionArtifact, ProjectContext } from './types.ts'

// CORS Utility Functions
export function getCorsHeaders(): Record<string, string> {
  return { ...CORS_HEADERS }
}

export function createResponse(data: any, status: number = 200, additionalHeaders?: Record<string, string>): Response {
  const headers = getCorsHeaders()
  
  if (additionalHeaders) {
    Object.assign(headers, additionalHeaders)
  }
  
  const body = typeof data === 'string' ? data : JSON.stringify(data)
  
  return new Response(body, {
    status,
    headers
  })
}

export function createErrorResponse(error: string, status: number = 500, details?: string): Response {
  const errorData = details ? { error, details } : { error }
  return createResponse(errorData, status)
}

// Generic JSON extraction for artifacts
export function extractArtifact(text: string): any | null {
  // Find all potential JSON objects in the text
  const jsonMatches: string[] = []
  let braceCount = 0
  let startIndex = -1
  
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (braceCount === 0) {
        startIndex = i
      }
      braceCount++
    } else if (text[i] === '}') {
      braceCount--
      if (braceCount === 0 && startIndex !== -1) {
        jsonMatches.push(text.substring(startIndex, i + 1))
      }
    }
  }
  
  // Try to parse each potential JSON object
  for (const jsonStr of jsonMatches) {
    try {
      const parsed = JSON.parse(jsonStr)
      
      // Check if it's an artifact (has artifact_id field)
      if (parsed && 
          typeof parsed === 'object' && 
          parsed.artifact_id !== undefined) {
        return parsed
      }
    } catch (e) {
      // Continue to next potential JSON
      continue
    }
  }
  
  return null
}

// Generate system prompt for concept testing
export function generateSystemPrompt(projectContext?: ProjectContext, existingArtifacts?: SessionArtifact[]): string {
  let prompt = `You are an expert research consultant specializing in concept testing, survey design, and market research methodology. Your role is to help users create effective surveys, analyze results, and improve their research approach.

Key capabilities:
1. Survey Design: Help craft clear, unbiased questions and optimal survey structure
2. Template Generation: Create survey templates that can be parsed by frontend applications
3. Results Analysis: Interpret survey data and provide actionable insights
4. Methodology Advice: Guide users on research best practices and statistical validity

When generating survey templates, use this structure and ALWAYS include an artifact_id:
{
  "artifact_id": "existing-artifact-id" | "new",
  "title": "Survey Title",
  "description": "Survey description",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice" | "rating_scale" | "text" | "yes_no" | "ranking",
      "question": "Question text",
      "options": ["Option 1", "Option 2"] // for multiple choice
      "scale": {"min": 1, "max": 5, "labels": {"1": "Poor", "5": "Excellent"}} // for rating scales
    }
  ],
  "metadata": {
    "estimated_time": "5 minutes",
    "target_responses": 100
  }
}

IMPORTANT FORMATTING GUIDELINES:
- When creating survey templates, refer to them as "survey templates", "polls", "questionnaires", or "surveys" - never explicitly mention "JSON"
- Do not use markdown code fences (backticks or code blocks) around the template structure
- Present the template data cleanly without technical formatting
- If updating an existing artifact, use its artifact_id from the list below
- If creating something completely new, use artifact_id: "new"
- Always include the artifact_id field in your response`

  // Add existing artifacts context
  if (existingArtifacts && existingArtifacts.length > 0) {
    const artifactsList = existingArtifacts.map(artifact => 
      `- artifact_id: ${artifact.id}, title: "${artifact.template_name}", version: ${artifact.version}`
    ).join('\n')
    
    prompt += `\n\nExisting artifacts in this conversation:\n${artifactsList}\n`
  } else {
    prompt += `\n\nNo existing artifacts in this conversation yet.\n`
  }

  prompt += `\nAlways provide practical, actionable advice based on research best practices.`

  if (projectContext) {
    prompt += `\n\nProject Context:\n- Name: ${projectContext.name}\n- Description: ${projectContext.description}\n- Target Audience: ${projectContext.target_audience}\n- Research Goals: ${projectContext.research_goals?.join(', ')}`
  } else {
    prompt += `\n\nYou are currently operating in standalone mode without specific project context. Provide general guidance that can be applied to various concept testing scenarios.`
  }

  return prompt
}

// Function to clean text by removing code fences and JSON references
export function cleanTextContent(text: string): string {
  return text
    // Remove markdown code fences
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    // Clean up common JSON reference phrases
    .replace(/Here's a JSON survey template[^:]*:/gi, 'Here\'s a survey template:')
    .replace(/Here's a JSON template[^:]*:/gi, 'Here\'s a template:')
    .replace(/JSON survey template/gi, 'survey template')
    .replace(/JSON template/gi, 'template')
    .trim()
}
