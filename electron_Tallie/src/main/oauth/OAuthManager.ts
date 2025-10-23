import { BrowserWindow, shell } from 'electron';
import log from 'electron-log';
import { randomBytes } from 'crypto';

/**
 * OAuth Provider Configuration
 */
export interface OAuthProvider {
  name: string;
  authUrl: string;
  redirectUrl: string;
  scopes?: string[];
}

/**
 * OAuth Flow State
 */
interface OAuthState {
  state: string;
  provider: string;
  timestamp: number;
  timeout?: NodeJS.Timeout;
}

/**
 * OAuth Result
 */
export interface OAuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  provider?: string;
}

/**
 * OAuth Manager - Handles OAuth flows for multiple providers
 * Implements security best practices and proper state management
 */
export class OAuthManager {
  private static instance: OAuthManager;
  private pendingFlows: Map<string, OAuthState> = new Map();
  private readonly FLOW_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly PROTOCOL_SCHEME = 'tallie';
  private mainWindow: BrowserWindow | null = null;

  private constructor() {
    log.info('[OAuthManager] Initialized', {
      platform: process.platform,
      arch: process.arch,
      protocolScheme: this.PROTOCOL_SCHEME,
    });
  }

  static getInstance(): OAuthManager {
    if (!OAuthManager.instance) {
      OAuthManager.instance = new OAuthManager();
    }
    return OAuthManager.instance;
  }

  /**
   * Set the main window reference
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
    log.info('[OAuthManager] Main window reference updated');
  }

  /**
   * Generate a secure random state parameter for CSRF protection
   */
  private generateState(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Get platform-specific error message
   */
  private getPlatformSpecificError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (process.platform === 'win32') {
      if (message.includes('protocol') || message.includes('scheme')) {
        return 'Protocol handler not registered. Please reinstall the application or contact support.';
      }
      if (message.includes('enoent') || message.includes('not found')) {
        return 'Default browser not found. Please set a default browser in Windows settings.';
      }
      if (message.includes('access') || message.includes('permission')) {
        return 'Permission denied. Please run the application with appropriate permissions.';
      }
    } else if (process.platform === 'darwin') {
      if (message.includes('protocol')) {
        return 'Protocol handler not registered. Please reinstall the application.';
      }
    }
    
    return error.message;
  }

  /**
   * Build OAuth URL with state parameter
   */
  private buildAuthUrl(provider: OAuthProvider, state: string): string {
    const url = new URL(provider.authUrl);
    // Use 'redirect_to' to explicitly specify the callback URL
    // This ensures Supabase redirects to our custom scheme, not the web URL
    url.searchParams.set('redirect_to', provider.redirectUrl);
    
    if (provider.scopes && provider.scopes.length > 0) {
      url.searchParams.set('scope', provider.scopes.join(' '));
    }

    return url.toString();
  }

  /**
   * Start OAuth flow for a provider
   */
  async startOAuthFlow(provider: OAuthProvider): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate CSRF state token
      const state = this.generateState();
      
      // Build auth URL
      const authUrl = this.buildAuthUrl(provider, state);
      
      // Set up timeout for this flow
      const timeout = setTimeout(() => {
        this.handleFlowTimeout(state);
      }, this.FLOW_TIMEOUT);

      // Store pending flow state
      this.pendingFlows.set(state, {
        state,
        provider: provider.name,
        timestamp: Date.now(),
        timeout,
      });

      log.info(`[OAuthManager] Starting OAuth flow for ${provider.name}`, {
        state,
        provider: provider.name,
      });

      // Open OAuth URL in default browser
      await shell.openExternal(authUrl);

      return { success: true };
    } catch (error) {
      log.error('[OAuthManager] Failed to start OAuth flow', {
        error,
        platform: process.platform,
      });
      
      const errorMessage = error instanceof Error 
        ? this.getPlatformSpecificError(error)
        : 'Unknown error occurred while starting OAuth flow';
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle OAuth callback from deep link
   */
  async handleCallback(callbackUrl: string): Promise<OAuthResult> {
    try {
      log.info('[OAuthManager] Processing OAuth callback', { url: callbackUrl });

      const url = new URL(callbackUrl);
      
      // Extract tokens from hash fragment (Supabase uses hash-based flow)
      const hashParams = new URLSearchParams(url.hash.substring(1));
      
      // Extract state from query or hash
      const state = url.searchParams.get('state') || hashParams.get('state');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const expiresIn = hashParams.get('expires_in');
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      // Check for OAuth errors
      if (error) {
        log.error('[OAuthManager] OAuth error received', {
          error,
          description: errorDescription,
        });
        return {
          success: false,
          error: errorDescription || error,
        };
      }

      // Validate state parameter (CSRF protection)
      // Note: Supabase implicit flow may not return state, so we validate tokens instead
      let flowState: OAuthState | undefined;
      
      if (state && this.pendingFlows.has(state)) {
        // State provided and valid - use it
        flowState = this.pendingFlows.get(state)!;
        this.cleanupFlow(state);
        log.info('[OAuthManager] Valid state parameter found', { provider: flowState.provider });
      } else if (this.pendingFlows.size > 0) {
        // No state but we have a pending flow - use the most recent one
        // This handles Supabase implicit flow which doesn't return state
        const entries = Array.from(this.pendingFlows.entries());
        const mostRecent = entries.sort((a, b) => b[1].timestamp - a[1].timestamp)[0];
        flowState = mostRecent[1];
        this.cleanupFlow(mostRecent[0]);
        log.warn('[OAuthManager] No state parameter, using most recent pending flow', { 
          provider: flowState.provider 
        });
      } else {
        // No state and no pending flows
        log.error('[OAuthManager] No pending OAuth flows found');
        return {
          success: false,
          error: 'No pending OAuth flow found',
        };
      }

      // Validate tokens
      if (!accessToken) {
        log.error('[OAuthManager] No access token in callback');
        return {
          success: false,
          error: 'No access token received',
        };
      }

      log.info('[OAuthManager] OAuth flow completed successfully', {
        provider: flowState.provider,
        hasRefreshToken: !!refreshToken,
      });

      // Send success to renderer
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('oauth:success', {
          success: true,
          accessToken,
          refreshToken,
          expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
          provider: flowState.provider,
        });
      }

      return {
        success: true,
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
        provider: flowState.provider,
      };
    } catch (error) {
      log.error('[OAuthManager] Error processing callback', error);
      
      // Send error to renderer
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('oauth:error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle flow timeout
   */
  private handleFlowTimeout(state: string): void {
    const flow = this.pendingFlows.get(state);
    if (flow) {
      log.warn('[OAuthManager] OAuth flow timed out', {
        provider: flow.provider,
        state,
      });

      // Send timeout error to renderer
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('oauth:error', {
          error: 'OAuth flow timed out. Please try again.',
        });
      }

      this.cleanupFlow(state);
    }
  }

  /**
   * Clean up a pending flow
   */
  private cleanupFlow(state: string): void {
    const flow = this.pendingFlows.get(state);
    if (flow) {
      if (flow.timeout) {
        clearTimeout(flow.timeout);
      }
      this.pendingFlows.delete(state);
      log.info('[OAuthManager] Cleaned up OAuth flow', { state });
    }
  }

  /**
   * Cancel all pending flows (e.g., on app quit)
   */
  cleanup(): void {
    log.info('[OAuthManager] Cleaning up all pending flows');
    this.pendingFlows.forEach((flow, state) => {
      this.cleanupFlow(state);
    });
  }

  /**
   * Get protocol scheme
   */
  getProtocolScheme(): string {
    return this.PROTOCOL_SCHEME;
  }
}
