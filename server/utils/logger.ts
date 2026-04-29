import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file"; // ✅ FIX

const transport = new DailyRotateFile({   // ✅ FIX HERE
  filename: "logs/app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
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