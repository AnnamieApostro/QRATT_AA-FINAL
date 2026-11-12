
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = true;

const listeners = new Set<() => void>();

let initialized = false;
let initializationPromise: Promise<void> | null = null;

function getAuthState(): AuthState {
  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function setAuth(session: Session | null) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}

async function initializeAuth(): Promise<void> {
  if (initialized) return;

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      console.log('QRATT: Starting authentication initialization');

      supabase.auth.onAuthStateChange((_event, session) => {
        console.log('QRATT: Auth state changed');
        setAuth(session);
      });

      console.log('QRATT: Starting getSession');

      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Authentication timed out after 10 seconds.'));
          }, 10000);
        }),
      ]);

      if (sessionResult.error) {
        throw sessionResult.error;
      }

      console.log('QRATT: getSession finished', {
        hasSession: !!sessionResult.data.session,
      });

      setAuth(sessionResult.data.session);

      console.log('QRATT: Authentication initialization finished');
    } catch (error) {
      console.error('QRATT: Authentication initialization failed:', error);
      setAuth(null);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Always finish loading, even if initialization fails.
      globalLoading = false;
      initialized = true;
      initializationPromise = null;
      notify();

      console.log('QRATT: Final authentication state:', {
        loading: globalLoading,
        hasSession: !!globalSession,
      });
    }
  })();

  return initializationPromise;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>(getAuthState);

  useEffect(() => {
    let mounted = true;

    const listener = () => {
      if (mounted) {
        setAuthState(getAuthState());
      }
    };

    listeners.add(listener);

    // Read the latest state immediately after subscribing.
    listener();

    void initializeAuth();

    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  return authState;
}

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (!error && data.session && profile) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        role: profile.role,
      })
      .eq('id', data.session.user.id);

    if (profileError) {
      console.error('Profile update failed:', profileError.message);
    }
  }

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signIn(
  email: string,
  password: string
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (!error) {
    setAuth(null);
  }

  return { error };
}
