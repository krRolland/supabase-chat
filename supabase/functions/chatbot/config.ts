// Configuration for the chatbot edge function - now imports from shared

// Re-export shared configuration
export { 
  config, 
  ALLOWED_ORIGINS, 
  CORS_METHODS, 
  CORS_HEADERS_ALLOWED, 
  CLAUDE_CONFIG, 
  APP_CONFIG, 
  validateConfig 
} from '../_shared/config.ts'
