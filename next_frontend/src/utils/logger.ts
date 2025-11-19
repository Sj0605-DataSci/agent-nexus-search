/**
 * Centralized logging utility for the application
 * Automatically removes logs in production builds
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Debug level logging - only in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  /**
   * Info level logging - only in development
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage("info", message, context));
    }
  }

  /**
   * Warning level logging - all environments
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("warn", message, context));
  }

  /**
   * Error level logging - all environments
   * Also sends to error tracking service in production
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    };

    console.error(this.formatMessage("error", message, errorContext));

    // In production, send to error tracking service (Sentry)
    if (this.isProduction && typeof window !== "undefined") {
      // Sentry will automatically capture console.error
      // Additional custom error tracking can be added here
    }
  }

  /**
   * API request logging - only in development
   */
  apiRequest(method: string, url: string, data?: unknown): void {
    if (this.isDevelopment) {
      this.debug(`➡️ API Request: ${method.toUpperCase()} ${url}`, { data });
    }
  }

  /**
   * API response logging - only in development
   */
  apiResponse(method: string, url: string, status: number, data?: unknown): void {
    if (this.isDevelopment) {
      this.debug(`✅ API Response: ${method.toUpperCase()} ${url} [${status}]`, { data });
    }
  }

  /**
   * API error logging - all environments
   */
  apiError(method: string, url: string, error: unknown): void {
    this.error(`❌ API Error: ${method.toUpperCase()} ${url}`, error);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logApiRequest = logger.apiRequest.bind(logger);
export const logApiResponse = logger.apiResponse.bind(logger);
export const logApiError = logger.apiError.bind(logger);
