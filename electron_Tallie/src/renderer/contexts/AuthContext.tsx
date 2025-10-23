import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, AuthState } from '../../lib/supabase/auth';
import type { User } from '@supabase/supabase-js';

// Logger for renderer process
const log = {
  info: (...args: unknown[]) => console.log('[AuthProvider]', ...args),
  error: (...args: unknown[]) => console.error('[AuthProvider]', ...args),
};

/**
 * Auth Context Value
 */
interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<{ success: boolean; error?: string }>;
  setSessionFromTokens: (accessToken: string, refreshToken: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
}

/**
 * Auth Context
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Auth Provider Component
 * Provides authentication state and methods to the entire app
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  // Initialize auth service on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        await authService.initialize();
        
        if (mounted) {
          const state = authService.getState();
          setAuthState(state);
        }
      } catch (error) {
        log.error('[AuthProvider] Initialization error:', error);
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((state) => {
      setAuthState(state);
    });

    return unsubscribe;
  }, []);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    return authService.signInWithOAuth('google');
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    return authService.signOut();
  }, []);

  // Refresh session
  const refreshSession = useCallback(async () => {
    return authService.refreshSession();
  }, []);

  // Set session from tokens (for email/password login)
  const setSessionFromTokens = useCallback(async (accessToken: string, refreshToken: string) => {
    return authService.setSessionFromTokens(accessToken, refreshToken);
  }, []);

  const contextValue: AuthContextValue = {
    ...authState,
    signInWithGoogle,
    signOut,
    refreshSession,
    setSessionFromTokens,
    isAuthenticated: !!authState.session && !!authState.user, // Use reactive state
  };


  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to get current user
 */
export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}
