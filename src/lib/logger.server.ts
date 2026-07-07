import "@tanstack/react-start/server-only";
import { env } from "#/env/server";

type LogContext = Record<string, boolean | null | number | string | string[] | undefined>;
type LogLevel = "debug" | "error" | "info" | "warn";

const emailMaskPattern = /^(.).+(@.+)$/;
const logLevels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function cleanContext(context?: LogContext) {
  if (!context) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(context).filter(
      (entry): entry is [string, Exclude<LogContext[string], undefined>] => {
        const [, value] = entry;
        return value !== undefined;
      },
    ),
  );
}

function normalizeLevel(level: string): LogLevel {
  return level in logLevels ? (level as LogLevel) : "info";
}

function shouldLog(level: LogLevel) {
  return logLevels[level] >= logLevels[normalizeLevel(env.LOG_LEVEL)];
}

function writeLog(level: LogLevel, event: string, context?: LogContext) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...cleanContext(context),
  };

  console[level](JSON.stringify(payload));
}

export function maskEmail(email: string) {
  return email.replace(emailMaskPattern, "$1***$2");
}

export const logger = {
  debug(event: string, context?: LogContext) {
    writeLog("debug", event, context);
  },
  error(event: string, context?: LogContext) {
    writeLog("error", event, context);
  },
  info(event: string, context?: LogContext) {
    writeLog("info", event, context);
  },
  warn(event: string, context?: LogContext) {
    writeLog("warn", event, context);
  },
};
