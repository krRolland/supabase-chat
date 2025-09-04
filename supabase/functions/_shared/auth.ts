// Authentication utilities for edge functions

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { config } from './config.ts'

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)

// Authentication helper
export async function authenticateUser(authHeader: string | null): Promise<any> {
  if (!authHeader) {
    throw new Error('Authorization required')
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (authError || !user) {
    throw new Error('Invalid authorization')
  }

  return user
}

// Export supabase client for use in other modules
export { supabase }
