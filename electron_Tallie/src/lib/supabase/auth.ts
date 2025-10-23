import { supabase } from './client';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// Logger for renderer process (use console instead of electron-log)
const log = {
  info: (...args: unknown[]) => console.log('[AuthService]', ...args),
  error: (...args: unknown[]) => console.error('[AuthService]', ...args),
  warn: (...args: unknown[]) => console.warn('[AuthService]', ...args),
};

/**
 * Authentication state
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

/**
 * OAuth result from IPC
 */
interface OAuthIPCResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  provider?: string;
  error?: string;
}

/**
 * Auth state change callback
 */
type AuthStateCallback = (state: AuthState) => void;

/**
 * Production-ready Authentication Service
 * Handles OAuth flows, session management, and state synchronization
 */
export class AuthService {
  private static instance: AuthService;
  private authStateListeners: Set<AuthStateCallback> = new Set();
  private currentState: AuthState = {
    user: null,
    session: null,
    loading: true,
    error: null,
  };
  private initialized = false;
  private cleanupFunctions: Array<() => void> = [];

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize the auth service
   * Should be called once when the app starts
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      log.warn('[AuthService] Already initialized');
      return;
    }

    log.info('[AuthService] Initializing...');

    try {
      // Check for existing session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        log.error('[AuthService] Error getting session:', error);
        this.updateState({
          user: null,
          session: null,
          loading: false,
          error,
        });
      } else {
        this.updateState({
          user: session?.user ?? null,
          session: session ?? null,
          loading: false,
          error: null,
        });
      }

      // Set up Supabase auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          log.info('[AuthService] Auth state changed:', event);
          
          this.updateState({
            user: session?.user ?? null,
            session: session ?? null,
            loading: false,
            error: null,
          });
        }
      );

      // Store cleanup function
      this.cleanupFunctions.push(() => {
        subscription.unsubscribe();
      });

      // Set up OAuth callback listeners
      this.setupOAuthListeners();

      this.initialized = true;
      log.info('[AuthService] Initialized successfully');
    } catch (error) {
      log.error('[AuthService] Initialization error:', error);
      this.updateState({
        user: null,
        session: null,
        loading: false,
        error: error as AuthError,
      });
    }
  }

  /**
   * Set up OAuth IPC listeners
   */
  private setupOAuthListeners(): void {
    if (typeof window === 'undefined' || !window.electron) {
      log.warn('[AuthService] Electron IPC not available');
      return;
    }

    // Listen for OAuth success
    const unsubscribeSuccess = window.electron.ipcRenderer.on(
      'oauth:success',
      async (...args: unknown[]) => {
        const result = args[0] as OAuthIPCResult;
        log.info('[AuthService] OAuth success received');
        
        try {
          if (!result.accessToken || !result.refreshToken) {
            throw new Error('Missing tokens in OAuth result');
          }

          // Set session with tokens from OAuth callback
          const { data, error } = await supabase.auth.setSession({
            access_token: result.accessToken,
            refresh_token: result.refreshToken,
          });

          if (error) {
            log.error('[AuthService] Error setting session:', error);
            this.updateState({
              user: null,
              session: null,
              loading: false,
              error,
            });
            return;
          }

          log.info('[AuthService] OAuth login successful:', {
            email: data.user?.email,
            provider: result.provider,
          });

          // Save tokens to localStorage for API client
          if (data.session?.access_token) {
            localStorage.setItem('discover_minds_access_token', data.session.access_token);
            log.info('[AuthService] Saved access token to localStorage');
          }
          
          if (data.session?.refresh_token) {
            localStorage.setItem('discover_minds_refresh_token', data.session.refresh_token);
            log.info('[AuthService] Saved refresh token to localStorage');
          }

          this.updateState({
            user: data.user,
            session: data.session,
            loading: false,
            error: null,
          });
        } catch (error) {
          log.error('[AuthService] Error processing OAuth success:', error);
          this.updateState({
            user: null,
            session: null,
            loading: false,
            error: error as AuthError,
          });
        }
      }
    );

    // Listen for OAuth errors
    const unsubscribeError = window.electron.ipcRenderer.on(
      'oauth:error',
      (...args: unknown[]) => {
        const result = args[0] as { error: string };
        log.error('[AuthService] OAuth error received:', result.error);
        
        this.updateState({
          user: null,
          session: null,
          loading: false,
          error: { message: result.error, name: 'OAuthError' } as AuthError,
        });
      }
    );

    // Store cleanup functions
    this.cleanupFunctions.push(unsubscribeSuccess, unsubscribeError);
  }

  /**
   * Update internal state and notify listeners
   */
  private updateState(newState: Partial<AuthState>): void {
    this.currentState = { ...this.currentState, ...newState };
    this.notifyListeners();
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.authStateListeners.forEach((listener) => {
      try {
        listener(this.currentState);
      } catch (error) {
        log.error('[AuthService] Error in state listener:', error);
      }
    });
  }

  /**
   * Subscribe to auth state changes
   * Returns unsubscribe function
   */
  onAuthStateChange(callback: AuthStateCallback): () => void {
    this.authStateListeners.add(callback);
    
    // Immediately call with current state
    try {
      callback(this.currentState);
    } catch (error) {
      log.error('[AuthService] Error in initial callback:', error);
    }
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners.delete(callback);
    };
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return { ...this.currentState };
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(provider: string): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized) {
      log.error('[AuthService] Not initialized');
      return { success: false, error: 'Auth service not initialized' };
    }

    if (typeof window === 'undefined' || !window.electron) {
      log.error('[AuthService] Electron IPC not available');
      return { success: false, error: 'Electron IPC not available' };
    }

    try {
      log.info(`[AuthService] Starting OAuth flow for provider: ${provider}`);
      
      this.updateState({ loading: true, error: null });

      const result = await window.electron.ipcRenderer.invoke<OAuthIPCResult>(
        'oauth:signin',
        provider
      );

      if (!result.success) {
        log.error('[AuthService] OAuth flow failed:', result.error);
        this.updateState({ 
          loading: false,
          error: { message: result.error || 'OAuth failed', name: 'OAuthError' } as AuthError
        });
        return { success: false, error: result.error };
      }

      log.info('[AuthService] OAuth flow initiated successfully');
      // Don't reset loading - wait for callback
      return { success: true };
    } catch (error) {
      log.error('[AuthService] Error initiating OAuth:', error);
      this.updateState({ 
        loading: false,
        error: error as AuthError
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      log.info('[AuthService] Signing out');
      
      this.updateState({ loading: true, error: null });

      const { error } = await supabase.auth.signOut();

      if (error) {
        log.error('[AuthService] Sign out error:', error);
        this.updateState({ loading: false, error });
        return { success: false, error: error.message };
      }

      this.updateState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });

      log.info('[AuthService] Signed out successfully');
      return { success: true };
    } catch (error) {
      log.error('[AuthService] Sign out error:', error);
      this.updateState({ loading: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentState.user;
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentState.session;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentState.session && !!this.currentState.user;
  }

  /**
   * Set session from access and refresh tokens
   * Used after email/password login via API
   */
  async setSessionFromTokens(
    accessToken: string,
    refreshToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      log.info('[AuthService] Setting session from tokens');
      
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        log.error('[AuthService] Error setting session:', error);
        this.updateState({
          user: null,
          session: null,
          loading: false,
          error,
        });
        return { success: false, error: error.message };
      }

      log.info('[AuthService] Session set successfully:', {
        email: data.user?.email,
      });

      this.updateState({
        user: data.user,
        session: data.session,
        loading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      log.error('[AuthService] Error setting session:', error);
      this.updateState({ loading: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      log.info('[AuthService] Refreshing session');
      
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        log.error('[AuthService] Session refresh error:', error);
        return { success: false, error: error.message };
      }

      this.updateState({
        user: data.user,
        session: data.session,
        error: null,
      });

      log.info('[AuthService] Session refreshed successfully');
      return { success: true };
    } catch (error) {
      log.error('[AuthService] Session refresh error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cleanup - call when app is closing
   */
  cleanup(): void {
    log.info('[AuthService] Cleaning up');
    
    // Remove all IPC listeners
    this.cleanupFunctions.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        log.error('[AuthService] Error during cleanup:', error);
      }
    });
    
    this.cleanupFunctions = [];
    this.authStateListeners.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
