// Response utility functions for edge functions

import { getCorsHeaders } from './cors.ts'

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
