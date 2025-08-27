// Utility functions for the chatbot edge function

import { ALLOWED_ORIGINS, CORS_METHODS, CORS_HEADERS_ALLOWED } from './config.ts'
import type { SessionArtifact, ProjectContext } from './types.ts'

// CORS Utility Functions
export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  // Determine the allowed origin based on the request
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) 
    ? requestOrigin 
    : ALLOWED_ORIGINS[0]; // fallback to production domain
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': CORS_METHODS,
    'Access-Control-Allow-Headers': CORS_HEADERS_ALLOWED,
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };
}

export function createResponse(data: any, status: number = 200, additionalHeaders?: Record<string, string>, requestOrigin?: string): Response {
  const headers = getCorsHeaders(requestOrigin)
  
  if (additionalHeaders) {
    Object.assign(headers, additionalHeaders)
  }
  
  const body = typeof data === 'string' ? data : JSON.stringify(data)
  
  return new Response(body, {
    status,
    headers
  })
}

export function createErrorResponse(error: string, status: number = 500, details?: string, requestOrigin?: string): Response {
  const errorData = details ? { error, details } : { error }
  return createResponse(errorData, status, undefined, requestOrigin)
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
      
      // Check if it's an artifact (has group_id field)
      if (parsed && 
          typeof parsed === 'object' && 
          parsed.group_id !== undefined) {
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
5. Pages have no more than 2 content blocks. To display media blocks and question blocks side by side, give the media column position value of 0 and the question block a position of 1 (or vice versa, depending on what feels best).
6. If it makes sense for the user to upload their own image in the survey, leave URL parameter as "new".
7. Questions that are tied to a set of media items are supposed to all belong on the same page. Questions that are stand-alone can all be lumped together on the same page, unless their sequence should come before a certain visual display. 
8. Ensure some of the questions are not only incredibly effective, but have them highlight information that the user might find interesting or amusing when asked to members of their own social circle.
9. Before generating or updating a survey, ask users somewhere between 2-4 questions about their project context. Make sure you understand the stage of the product.
10. An implicit job of the survey is to "present the meme" – to generate content that serves as the presentational / meme layer that represents the project and a user to their own social and professional circles. Quesitons and information should be presented in a way that's not only robust but leaves respondents excited and makes them feel connected to the survey creator somehow.

When generating survey templates, use this structure and ALWAYS include both group_id and title fields:
{
  "group_id": "existing-group-id" | "new",
  "title": "Descriptive Survey Title",
  "description": "Survey description",
  "pages": [
    {
      "position": 0,
      "title": "Page Title",
      "description": "Page description",
      "page_type": "WELCOME" | "STANDARD" | "THANK_YOU",
      "visual_layout": null,
      "options": null,
      "content_blocks": [
        {
          "type": "MEDIA_SET" | "QUESTION_SET",
          "position": 0,
          "items": [
            // For MEDIA_SET items:
            {
              "position": 0,
              "title": "Media Title",
              "description": "Media description",
              "media_type": "IMAGE" | "DESCRIPTION" | "VIDEO" | "URL",
              "media_data": {
                "text": "Text content", // for DESCRIPTION
                "url": "https://example.com/existing-image.jpg" | "new", // for IMAGE/VIDEO/URL
                "alt_text": "Alt text for accessibility" // for IMAGE/VIDEO
              }
            },
            // For QUESTION_SET items:
            {
              "position": 0,
              "text": "Question text",
              "response_type": "NUMBER_SELECT" | "FREE_RESPONSE" | "MULTIPLE_CHOICE" | "SLIDER",
              "response_options": {
                "min_label": "Very Unsatisfied", // for NUMBER_SELECT/SLIDER
                "max_label": "Very Satisfied", // for NUMBER_SELECT/SLIDER
                "scale": 5, // for NUMBER_SELECT/SLIDER
                "placeholder": "Enter your response...", // for FREE_RESPONSE
                "options": ["Option 1", "Option 2", "Option 3"] // for MULTIPLE_CHOICE
              }
            }
          ]
        }
      ]
    }
  ]
}

CONTENT BLOCK USAGE PATTERNS:
- MEDIA_SET: Use when showing one or more media items (images, videos, descriptions, URLs)
  * Often contains multiple items for A/B testing purposes (showing different concepts side-by-side)
  * Group related media that should be displayed together
  * Common for concept testing where users compare multiple designs/ideas
  
- QUESTION_SET: Use when asking multiple related questions
  * Often paired with a MEDIA_SET on the same page to ask questions about the media shown
  * Group questions that relate to the same concept or media
  * Allows asking several questions about one set of visuals

TYPICAL PAGE PATTERNS:
- Welcome pages: Usually have MEDIA_SET with DESCRIPTION media_type for introductory text
- Standard pages: Often have both MEDIA_SET (showing concepts) and QUESTION_SET (asking about them)
- Thank you pages: Usually have MEDIA_SET with DESCRIPTION for closing message

PAGE TYPES:
- WELCOME: Introduction/welcome pages
- STANDARD: Main content pages with questions and/or media
- THANK_YOU: Closing/completion pages

CRITICAL REQUIREMENTS:
- ALWAYS include a meaningful "title" field that describes the survey's purpose
- The title should be descriptive and user-friendly (e.g., "Customer Satisfaction Survey", "Product Feature Feedback", "User Experience Assessment")
- If updating an existing artifact, use its group_id from the list below
- If creating something completely new, use group_id: "new"
- Both group_id and title fields are mandatory for proper frontend display

IMPORTANT FORMATTING GUIDELINES:
- When creating survey templates, refer to them as "survey templates", "polls", "questionnaires", or "surveys" - never explicitly mention "JSON"
- Do not use markdown code fences (backticks or code blocks) around the template structure
- Present the template data cleanly without technical formatting
- Always include both the group_id and title fields in your response`

  // Add existing artifacts context
  if (existingArtifacts && existingArtifacts.length > 0) {
    const artifactsList = existingArtifacts.map(artifact => 
      `- group_id: ${artifact.id}, title: "${artifact.title}", version: ${artifact.version}`
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
