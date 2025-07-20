import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emailRateLimiter } from "../middleware/rateLimiter.js";

const authRouter = Router();

// Register
authRouter.post(
  "/register",
  asyncHandler(AuthController.register).bind(AuthController)
);

// Email Verification
authRouter.get(
  "/verify-email/:token",
  emailRateLimiter,
  asyncHandler(AuthController.verifyEmail).bind(AuthController)
);

// Login
authRouter.post(
  "/login",
  asyncHandler(AuthController.login).bind(AuthController)
);

// Resend Verification Email
authRouter.post(
  "/resend-verification-email",
  emailRateLimiter,
  asyncHandler(AuthController.resendVerificationEmail).bind(AuthController)
);

// Forgot Password
authRouter.post(
  "/forgot-password",
  asyncHandler(AuthController.forgotPassword).bind(AuthController)
);

// Reset Password
authRouter.post(
  "/reset-password/:token",
  asyncHandler(AuthController.resetPassword).bind(AuthController)
);

// Refresh Token
authRouter.post(
  "/refresh-token",
  asyncHandler(AuthController.refreshToken).bind(AuthController)
);

// Logout
authRouter.post(
  "/logout",
  asyncHandler(AuthController.logout).bind(AuthController)
);

export default authRouter;
