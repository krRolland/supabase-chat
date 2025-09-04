// CORS utility functions for edge functions

import { ALLOWED_ORIGINS, CORS_METHODS, CORS_HEADERS_ALLOWED } from './config.ts'

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
