// Configuration for the question-rewriter edge function

// Environment configuration
export const config = {
  anthropicApiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
  supabaseUrl: Deno.env.get('SUPABASE_URL')!,
  supabaseServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
}

// CORS Configuration
export const ALLOWED_ORIGINS = [
  'https://panda-poll.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

export const CORS_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
export const CORS_HEADERS_ALLOWED = 'authorization, x-client-info, apikey, content-type';

// Claude API configuration
export const CLAUDE_CONFIG = {
  apiUrl: 'https://api.anthropic.com/v1/messages',
  apiVersion: '2023-06-01',
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 2000
}

// Configurable prompt template for question rewriting
export const REWORD_PROMPT_TEMPLATE = `You are an expert survey methodologist specializing in question design and bias reduction. Your task is to analyze a survey question and provide exactly 5 improved alternatives.

ORIGINAL QUESTION: {ORIGINAL_QUESTION}

SURVEY CONTEXT:
{SURVEY_CONTEXT}

CONVERSATION CONTEXT:
{CHAT_HISTORY}

Please provide exactly 5 reworded versions of this question. Each suggestion should:
1. Address different aspects of improvement (bias reduction, clarity, specificity, engagement, measurability)
2. Be appropriate for the survey's context and audience
3. Maintain the original intent while improving the methodology

Respond with a JSON object in this exact format:
{
  "suggestions": [
    {
      "reworded": "Your reworded question here",
      "reasoning": "Brief explanation of why this is better",
      "improvement_type": "bias_reduction|clarity|specificity|engagement|measurability",
      "confidence": 0.85
    }
  ]
}

Ensure you provide exactly 5 suggestions with varied improvement types. The confidence should be a decimal between 0.0 and 1.0.`

// Validate configuration on startup
export function validateConfig() {
  const requiredVars = [
    'ANTHROPIC_API_KEY',
    'SUPABASE_URL', 
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missing = requiredVars.filter(varName => !Deno.env.get(varName))
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
