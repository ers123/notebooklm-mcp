export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

let minLevel: LogLevel = LogLevel.INFO;

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (level < minLevel) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level: LEVEL_NAMES[level],
    message,
    ...(context && { context }),
  };

  process.stderr.write(JSON.stringify(entry) + '\n');
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log(LogLevel.DEBUG, message, context),
  info: (message: string, context?: Record<string, unknown>) => log(LogLevel.INFO, message, context),
  warn: (message: string, context?: Record<string, unknown>) => log(LogLevel.WARN, message, context),
  error: (message: string, context?: Record<string, unknown>) => log(LogLevel.ERROR, message, context),
  setLevel: (level: LogLevel) => { minLevel = level; },
};
