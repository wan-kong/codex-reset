import "@tanstack/react-start/server-only";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

import pino from "pino";

import { env } from "#/env/server";

type LogContext = Record<string, boolean | null | number | string | string[] | undefined>;

const logFileName = "app.log";
const emailMaskPattern = /^(.).+(@.+)$/;

function getLogFilePath() {
  const logDir = resolve(process.cwd(), env.LOG_DIR);
  mkdirSync(logDir, { recursive: true });
  return join(logDir, logFileName);
}

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

const pinoLogger = pino(
  {
    level: env.LOG_LEVEL,
    messageKey: "event",
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream([
    { stream: process.stdout },
    { stream: pino.destination({ dest: getLogFilePath(), sync: false }) },
  ]),
);

export function maskEmail(email: string) {
  return email.replace(emailMaskPattern, "$1***$2");
}

export const logger = {
  debug(event: string, context?: LogContext) {
    pinoLogger.debug(cleanContext(context), event);
  },
  error(event: string, context?: LogContext) {
    pinoLogger.error(cleanContext(context), event);
  },
  info(event: string, context?: LogContext) {
    pinoLogger.info(cleanContext(context), event);
  },
  warn(event: string, context?: LogContext) {
    pinoLogger.warn(cleanContext(context), event);
  },
};
