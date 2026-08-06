export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = Readonly<
  Record<string, boolean | number | string | null | undefined>
>

export interface AppLogger {
  debug(event: string, context?: LogContext): void
  error(event: string, context?: LogContext): void
  info(event: string, context?: LogContext): void
  warn(event: string, context?: LogContext): void
}

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export function createLogger(minimumLevel: LogLevel): AppLogger {
  const write = (
    level: LogLevel,
    event: string,
    context: LogContext = {},
  ): void => {
    if (levelOrder[level] < levelOrder[minimumLevel]) {
      return
    }

    const record = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...context,
    })

    if (level === 'error') {
      console.error(record)
      return
    }

    console.log(record)
  }

  return {
    debug: (event, context) => write('debug', event, context),
    error: (event, context) => write('error', event, context),
    info: (event, context) => write('info', event, context),
    warn: (event, context) => write('warn', event, context),
  }
}
