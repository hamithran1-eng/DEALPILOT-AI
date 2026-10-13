import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your-anon-public-key' &&
    supabaseUrl.startsWith('https://')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Initiates Google OAuth login via Supabase Auth
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  if (!supabase) {
    return {
      error: new Error(
        'Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment or Settings > Integrations.'
      ),
    };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  return { error };
}

/**
 * Sends a 6-digit Email OTP / Magic Link for passwordless authentication
 */
export async function signInWithEmailOtp(email: string): Promise<{ error: Error | null }> {
  if (!supabase) {
    return {
      error: new Error(
        'Supabase is not configured. Please configure your project credentials in Settings > Integrations.'
      ),
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}`,
    },
  });

  return { error };
}

/**
 * Verifies a 6-digit OTP code sent to user email
 */
export async function verifyEmailOtp(
  email: string,
  token: string
): Promise<{ session: any; error: Error | null }> {
  if (!supabase) {
    return {
      session: null,
      error: new Error('Supabase client is not initialized.'),
    };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  return { session: data.session, error };
}
