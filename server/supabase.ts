import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getServerSupabase(): SupabaseClient | null {
  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    supabaseUrl === 'https://your-project.supabase.co' ||
    serviceRoleKey === 'your-service-role-key'
  ) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isServerSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    serviceRoleKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    serviceRoleKey !== 'your-service-role-key'
  );
}
