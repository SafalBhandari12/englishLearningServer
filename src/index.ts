import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import morgan from "morgan";
import { createWriteStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import logger from "./utils/logger.js";
import prisma from "./utils/database.js";
import cookieParser from "cookie-parser";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create logs directory if it doesn't exist
import { mkdirSync } from "fs";

try {
  mkdirSync("logs");
} catch (err) {
  // Directory already exists
}

// Security middleware
app.use(helmet());
app.use(cors());
app.use(cookieParser(/* secret? if you want signed cookies */));

// Rate limiting
app.use(rateLimiter);

// Logging middleware
const accessLogStream = createWriteStream(
  join(__dirname, "../logs/access.log"),
  { flags: "a" }
);
app.use(morgan("combined", { stream: accessLogStream }));
app.use(morgan("dev")); // Console logging in development

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", routes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info("Database connected successfully");

    app.listen(PORT, () => {
      logger.info(
        `Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
      );
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
