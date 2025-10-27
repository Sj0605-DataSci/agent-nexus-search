import { OAuthProvider } from './OAuthManager';
import { getSupabaseConfig } from '../../config/supabase';

/**
 * OAuth Provider Factory
 * Centralized configuration for all OAuth providers
 */
export class OAuthProviders {
  private static readonly REDIRECT_PROTOCOL = 'tara://oauth/callback';

  /**
   * Get Google OAuth provider configuration
   */
  static getGoogleProvider(): OAuthProvider {
    const { supabaseUrl } = getSupabaseConfig();
    
    return {
      name: 'google',
      authUrl: `${supabaseUrl}/auth/v1/authorize?provider=google`,
      redirectUrl: this.REDIRECT_PROTOCOL,
      scopes: [], // Supabase handles scopes
    };
  }

  /**
   * Get GitHub OAuth provider configuration
   */
  static getGitHubProvider(): OAuthProvider {
    const { supabaseUrl } = getSupabaseConfig();
    
    return {
      name: 'github',
      authUrl: `${supabaseUrl}/auth/v1/authorize?provider=github`,
      redirectUrl: this.REDIRECT_PROTOCOL,
      scopes: [],
    };
  }

  /**
   * Get provider by name
   */
  static getProvider(name: string): OAuthProvider | null {
    switch (name.toLowerCase()) {
      case 'google':
        return this.getGoogleProvider();
      case 'github':
        return this.getGitHubProvider();
      default:
        return null;
    }
  }

  /**
   * Get all available providers
   */
  static getAllProviders(): OAuthProvider[] {
    return [
      this.getGoogleProvider(),
      this.getGitHubProvider(),
    ];
  }
}
