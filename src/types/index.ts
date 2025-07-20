export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string; // For validation errors
  messages?: string[]; // For validation error messages
}

export interface AuthRequestUser {
  userId: string;
  email: string;
  isEmailVerified: boolean;
  password?: string;
  name: string;
}

export interface AuthRequestBody {
  email: string;
  password: string;
  password_confirmation: string;
}


import { Request } from "express";
export interface AuthRequest extends Request<{}, {}, AuthRequestBody> {
  user?: AuthRequestUser;
}