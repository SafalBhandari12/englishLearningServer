import { PrismaClient } from "@prisma/client";
import logger from "./logger.js";
const prisma = new PrismaClient({
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "event" },
    { level: "info", emit: "event" },
    { level: "warn", emit: "event" },
  ],
});

// Log Prisma queries in development
if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e: any) => {
    logger.debug("Query: " + e?.query);
    logger.debug("Duration: " + e?.duration + "ms");
  });
}

prisma.$on("error", (e: any) => {
  logger.error("Prisma Error:", e);
});

export default prisma;
