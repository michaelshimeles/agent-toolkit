/**
 * Request/Response logging middleware
 * Provides structured logging for API requests with performance tracking
 */

export interface LogContext {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  timestamp: string;
  duration?: number;
  statusCode?: number;
  error?: string;
}

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  data?: Record<string, unknown>;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  log(level: LogLevel, message: string, context: LogContext, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      context,
      data,
    };

    this.logs.push(entry);

    // Trim logs if exceeds max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with color coding
    const timestamp = new Date(context.timestamp).toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context.requestId}]`;

    switch (level) {
      case "error":
        console.error(prefix, message, context, data);
        break;
      case "warn":
        console.warn(prefix, message, context, data);
        break;
      case "debug":
        console.debug(prefix, message, context, data);
        break;
      default:
        console.log(prefix, message, context, data);
    }
  }

  info(message: string, context: LogContext, data?: Record<string, unknown>) {
    this.log("info", message, context, data);
  }

  warn(message: string, context: LogContext, data?: Record<string, unknown>) {
    this.log("warn", message, context, data);
  }

  error(message: string, context: LogContext, data?: Record<string, unknown>) {
    this.log("error", message, context, data);
  }

  debug(message: string, context: LogContext, data?: Record<string, unknown>) {
    this.log("debug", message, context, data);
  }

  getLogs(filter?: Partial<LogContext>): LogEntry[] {
    if (!filter) return [...this.logs];

    return this.logs.filter((entry) => {
      return Object.entries(filter).every(([key, value]) => {
        return entry.context[key as keyof LogContext] === value;
      });
    });
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((entry) => entry.level === level);
  }

  clear() {
    this.logs = [];
  }
}

export const logger = new Logger();

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export interface RequestLoggerOptions {
  includeHeaders?: boolean;
  includeBody?: boolean;
  slowRequestThreshold?: number; // in ms
}

export function createRequestLogger(
  requestId: string,
  method: string,
  path: string,
  userId?: string
) {
  const startTime = Date.now();
  const context: LogContext = {
    requestId,
    method,
    path,
    userId,
    timestamp: new Date().toISOString(),
  };

  logger.info(`Incoming request: ${method} ${path}`, context);

  return {
    success: (statusCode: number, data?: Record<string, unknown>) => {
      const duration = Date.now() - startTime;
      logger.info(`Request completed: ${method} ${path}`, {
        ...context,
        duration,
        statusCode,
      }, data);

      // Warn on slow requests (>1s by default)
      if (duration > 1000) {
        logger.warn(`Slow request detected: ${method} ${path}`, {
          ...context,
          duration,
          statusCode,
        });
      }
    },
    error: (statusCode: number, error: Error | string, data?: Record<string, unknown>) => {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : error;

      logger.error(`Request failed: ${method} ${path}`, {
        ...context,
        duration,
        statusCode,
        error: errorMessage,
      }, data);
    },
  };
}
