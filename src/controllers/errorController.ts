import { Request, Response, NextFunction } from "express";
import { CustomError } from "../types/index.js";

export class AppError extends Error implements CustomError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number = 500) => {
  return new AppError(message, statusCode);
};
