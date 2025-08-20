// Claude API integration for the chatbot edge function

import { config, CLAUDE_CONFIG } from './config.ts'

// Claude API integration
export async function callClaude(messages: any[], systemPrompt: string): Promise<string> {
  const response = await fetch(CLAUDE_CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': CLAUDE_CONFIG.apiVersion
    },
    body: JSON.stringify({
      model: CLAUDE_CONFIG.model,
      max_tokens: CLAUDE_CONFIG.maxTokens,
      system: systemPrompt,
      messages: messages
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// Generate a conversation title based on the user's first message
export async function generateConversationTitle(userMessage: string): Promise<string> {
  const titlePrompt = `You are tasked with creating a concise, descriptive title for a conversation based on the user's first message. The title should:

1. Be 3-8 words long
2. Capture the main topic or intent of the user's inquiry
3. Be clear and professional
4. Not include quotation marks or special characters
5. Be suitable for display in a chat interface

User's first message: "${userMessage}"

Respond with ONLY the title, nothing else.`

  try {
    const response = await fetch(CLAUDE_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': CLAUDE_CONFIG.apiVersion
      },
      body: JSON.stringify({
        model: CLAUDE_CONFIG.model,
        max_tokens: 50, // Short response for title only
        system: titlePrompt,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      })
    })

    if (!response.ok) {
      console.error('Title generation failed, using fallback')
      return generateFallbackTitle(userMessage)
    }

    const data = await response.json()
    const title = data.content[0].text.trim()
    
    // Validate title length and content
    if (title.length > 0 && title.length <= 100) {
      return title
    } else {
      return generateFallbackTitle(userMessage)
    }
  } catch (error) {
    console.error('Error generating title:', error)
    return generateFallbackTitle(userMessage)
  }
}

// Generate a fallback title from the user's message
function generateFallbackTitle(userMessage: string): string {
  // Take first few words of the message, clean and truncate
  const words = userMessage.trim().split(/\s+/).slice(0, 6)
  let title = words.join(' ')
  
  // Truncate if too long
  if (title.length > 50) {
    title = title.substring(0, 47) + '...'
  }
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1)
  
  return title || 'New Conversation'
}
