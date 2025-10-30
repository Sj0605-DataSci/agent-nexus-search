/**
 * Environment Configuration
 * Handles environment-based API URL selection
 */

// Get environment from build-time process.env
// This is replaced at build time by webpack
const NODE_ENV = process.env.NODE_ENV || 'development';

// API URLs for each environment
const ENVIRONMENTS = {
  development: {
    http: 'http://localhost:8000',
    ws: 'ws://localhost:8000',
  },
  staging: {
    http: 'https://staging-apis.discoverminds.ai',
    ws: 'wss://staging-apis.discoverminds.ai',
  },
  production: {
    http: 'https://production-apis.discoverminds.ai',
    ws: 'wss://production-apis.discoverminds.ai',
  },
};

/**
 * Get current environment configuration
 */
export const getEnvironmentConfig = () => {
  const env = NODE_ENV as keyof typeof ENVIRONMENTS;
  const config = ENVIRONMENTS[env] || ENVIRONMENTS.development;
  
  return {
    environment: env,
    httpBaseURL: `${config.http}/api`,
    wsBaseURL: config.ws,
    isDevelopment: env === 'development',
    isStaging: env === 'staging',
    isProduction: env === 'production',
  };
};

/**
 * Get HTTP API base URL
 */
export const getAPIBaseURL = (): string => {
  return getEnvironmentConfig().httpBaseURL;
};

/**
 * Get WebSocket base URL
 */
export const getWSBaseURL = (): string => {
  return getEnvironmentConfig().wsBaseURL;
};

/**
 * Log current environment
 */
export const logEnvironment = () => {
  const config = getEnvironmentConfig();
  console.log('🌍 Environment:', config.environment);
  console.log('📡 HTTP API:', config.httpBaseURL);
  console.log('🔌 WebSocket:', config.wsBaseURL);
};

// Log on import (for debugging)
if (typeof window !== 'undefined') {
  logEnvironment();
}
