import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user || !isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (!cancelled) {
        if (error) setError(error.message);
        else setProfile((data as Profile | null) ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function signIn(email: string, password: string): Promise<string | null> {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      return error.message;
    }
    return null;
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  const currentProfile = profile?.id === session?.user.id ? profile : null;

  return {
    session,
    user: session?.user ?? null,
    profile: currentProfile,
    isAdmin: currentProfile?.role === 'admin',
    loading,
    error,
    signIn,
    signOut,
  };
}
