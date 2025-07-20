import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";
import { ErrorRequestHandler } from "express";
import { CustomError } from "../types/index.js";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (
  err: CustomError | ZodError,
  req,
  res,
  next
) => {
  logger.error(err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((error) => ({
      field: error.path.join("."),
      message: error.message,
    }));
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors,
    });
    return;
  }

  // Handle legacy Vine.js errors (if any remain)
  if (err.code === "E_VALIDATION_ERROR") {
    res.status(400).json({ success: false, message: err.messages });
    return;
  }

  const status = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ success: false, message });
};
export function notFound(req: Request, res: Response) {
  res.status(404).json({ success: false, message: "Not Found" });
}
