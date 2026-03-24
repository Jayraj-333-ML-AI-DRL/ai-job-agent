export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}

const COLORS: Record<LogLevel, string> = {
  [LogLevel.INFO]: "\x1b[36m",   // cyan
  [LogLevel.WARN]: "\x1b[33m",   // yellow
  [LogLevel.ERROR]: "\x1b[31m",  // red
  [LogLevel.DEBUG]: "\x1b[90m",  // grey
};
const RESET = "\x1b[0m";

function log(level: LogLevel, message: string, meta?: unknown): void {
  const ts = new Date().toISOString();
  const color = COLORS[level];
  const metaStr = meta ? " " + JSON.stringify(meta) : "";
  console.log(`${color}[${ts}] [${level}]${RESET} ${message}${metaStr}`);
}

export const logger = {
  info:  (msg: string, meta?: unknown) => log(LogLevel.INFO,  msg, meta),
  warn:  (msg: string, meta?: unknown) => log(LogLevel.WARN,  msg, meta),
  error: (msg: string, meta?: unknown) => log(LogLevel.ERROR, msg, meta),
  debug: (msg: string, meta?: unknown) => log(LogLevel.DEBUG, msg, meta),
  phase: (phase: number, name: string) => {
    console.log(`\n\x1b[35m${"─".repeat(60)}\x1b[0m`);
    console.log(`\x1b[35m  Phase ${phase}: ${name}\x1b[0m`);
    console.log(`\x1b[35m${"─".repeat(60)}\x1b[0m\n`);
  },
};
