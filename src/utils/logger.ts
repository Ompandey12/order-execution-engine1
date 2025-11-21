import { env } from '../config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';

function log(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (env.logLevel === 'error' && level !== 'error') return;
  if (env.logLevel === 'info' && level === 'debug') return;

  const base = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
  if (meta) {
    // eslint-disable-next-line no-console
    console.log(base, JSON.stringify(meta));
  } else {
    // eslint-disable-next-line no-console
    console.log(base);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta)
};
