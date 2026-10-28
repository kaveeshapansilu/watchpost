import { createClient } from '@supabase/supabase-js';
import { publicConnection } from './connection';

const connection = publicConnection(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
export const supabase = createClient(connection.url, connection.key, {
  auth: { persistSession: true, autoRefreshToken: true },
});
export const isSupabaseConfigured = connection.configured;
