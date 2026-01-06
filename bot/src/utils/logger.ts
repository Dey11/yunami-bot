type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
const CURRENT_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info';
function formatMessage(level: LogLevel, message: string, ...args: any[]): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const formatted = args.length > 0 ? `${message} ${JSON.stringify(args)}` : message;
  return `${prefix} ${formatted}`;
}
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}
export const logger = {
  debug(message: string, ...args: any[]) {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, ...args));
    }
  },
  info(message: string, ...args: any[]) {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, ...args));
    }
  },
  warn(message: string, ...args: any[]) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, ...args));
    }
  },
  error(message: string, ...args: any[]) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, ...args));
    }
  },
};
export default logger;
