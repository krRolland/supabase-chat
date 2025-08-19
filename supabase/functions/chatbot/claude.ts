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
