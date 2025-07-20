import { z } from "zod";

export const userSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters"),
    password_confirmation: z.string(),
    name: z
      .string()
      .min(1, "Name is required")
      .max(64, "Name must be less than 64 characters"),
    role: z.enum(["CANDIDATE", "COMPANY"], {
      errorMap: () => ({ message: "Role must be either CANDIDATE or COMPANY" }),
    }),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ["password_confirmation"],
  });

export const verifyEmailParamsSchema = z.object({
  token: z
    .string()
    .length(64, "Token must be exactly 64 characters")
    .regex(/^[0-9a-f]{64}$/, "Invalid token format"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters"),
});

export const resendVerificationEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters"),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ["password_confirmation"],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, "Refresh token is required")
    .max(512, "Refresh token is too long"),
});
