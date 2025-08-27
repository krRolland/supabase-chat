// Configuration and environment variables for the chatbot edge function

// Environment variables
export const config = {
  supabaseUrl: Deno.env.get('SUPABASE_URL')!,
  supabaseServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  anthropicApiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
}

// CORS Configuration
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

// Claude API Configuration
export const CLAUDE_CONFIG = {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 4000,
  apiVersion: '2023-06-01',
  apiUrl: 'https://api.anthropic.com/v1/messages'
}

// Application Configuration
export const APP_CONFIG = {
  chatHistoryLimit: 8, // Number of messages to include in context
  defaultArtifactType: 'survey_template',
  defaultSessionType: 'general',
  defaultSessionTitle: 'New Chat Session'
}

// Validation function for required environment variables
export function validateConfig(): void {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY']
  const missing = required.filter(key => !Deno.env.get(key))
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
