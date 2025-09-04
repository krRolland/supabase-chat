// Claude API utilities for edge functions

import { config, CLAUDE_CONFIG } from './config.ts'

// Call Claude API
export async function callClaude(prompt: string, maxTokens?: number): Promise<string> {
  const response = await fetch(CLAUDE_CONFIG.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': CLAUDE_CONFIG.apiVersion
    },
    body: JSON.stringify({
      model: CLAUDE_CONFIG.model,
      max_tokens: maxTokens || CLAUDE_CONFIG.maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.content[0].text
}
