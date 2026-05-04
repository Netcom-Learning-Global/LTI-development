import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { maskSensitive } from "./mask";
const transport = new DailyRotateFile({
  filename: "logs/app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
});
const maskFormat = winston.format((info) => {
  // mask message if object
  if (typeof info.message === "object") {
    info.message = maskSensitive(info.message);
  }

  // mask meta
  const metaKeys = Object.keys(info).filter(
    (key) => !["level", "message", "timestamp"].includes(key)
  );

  metaKeys.forEach((key) => {
    info[key] = maskSensitive(info[key]);
  });

  return info;
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    maskFormat(),
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const msg =
        typeof message === "object"
          ? JSON.stringify(message)
          : message;

      const metaStr =
        Object.keys(meta).length > 0
          ? JSON.stringify(meta)
          : "";

      return `${timestamp} [${level}] ${msg} ${metaStr}`;
    })
  ),
  transports: [
    transport,
    new winston.transports.Console(),
  ],
});

export default logger;