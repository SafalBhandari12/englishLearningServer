import { Request, Response } from "express";
import { AuthRequest } from "../types/index.js";
import prisma from "../utils/database.js";
import { createError } from "./errorController.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../utils/emailService.js";
import {
  userSchema,
  loginSchema,
  refreshTokenSchema,
  resendVerificationEmailSchema,
  resetPasswordSchema,
  verifyEmailParamsSchema,
} from "../validator/auth.js";
import {
  generateToken,
  generateVerificationToken,
  verifyRefreshToken,
} from "../utils/tokenUtils.js";

export class AuthController {
  static async register(req: AuthRequest, res: Response) {
    const validatedData = userSchema.parse(req.body);
    const { email, password, name, role } = validatedData;
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw createError("User already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const emailVerificationToken = generateVerificationToken();
    const emailVerificationTokenExpiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    ); // 5 minutes

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        verificationToken: emailVerificationToken,
        verificationTokenExpiresAt: emailVerificationTokenExpiresAt,
        name: name,
        role: role,
      },
    });

    await sendVerificationEmail(email, emailVerificationToken);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  }
  static async verifyEmail(req: Request, res: Response) {
    const { token } = verifyEmailParamsSchema.parse(req.params);
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (
      !user ||
      !user.verificationTokenExpiresAt ||
      user.verificationTokenExpiresAt < new Date()
    ) {
      throw createError("Invalid or expired verification token", 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      },
    });

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
    return;
  }
  static async login(req: AuthRequest, res: Response) {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw createError("Not signed in", 401);
    }
    if (!user.emailVerified) {
      throw createError("Email not verified", 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw createError("Invalid email or password", 401);
    }

    const { accessToken, refreshToken } = await generateToken({
      userId: user.id,
      role: user.role,
    });

    await prisma.refreshTokens.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isEmailVerified: user.emailVerified,
          role: user.role,
        },
        token: { accessToken, refreshToken },
      },
    });
    return;
  }
  static async resendVerificationEmail(req: AuthRequest, res: Response) {
    const { email } = resendVerificationEmailSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw createError("User not found", 404);
    }
    if (user.emailVerified) {
      throw createError("Email already verified", 400);
    }
    if (!user.verificationToken || !user.verificationTokenExpiresAt) {
      throw createError("Verification token not found", 404);
    }
    if (user.verificationTokenExpiresAt > new Date()) {
      throw createError("Verification token already sent", 400);
    }

    const emailVerificationToken = generateVerificationToken();
    const emailVerificationTokenExpiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    ); // 5 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: emailVerificationToken,
        verificationTokenExpiresAt: emailVerificationTokenExpiresAt,
      },
    });

    await sendVerificationEmail(email, emailVerificationToken);

    res.status(200).json({
      success: true,
      message: "Verification email resent successfully",
    });
  }
  static async forgotPassword(req: AuthRequest, res: Response) {
    const { email } = resendVerificationEmailSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw createError("User doesn't exist", 404);
    }

    // Generate reset token
    const resetToken = generateVerificationToken();
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiresAt: resetTokenExpiresAt,
      },
    });

    await sendPasswordResetEmail(email, resetToken);
    res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    });
  }
  static async resetPassword(req: AuthRequest, res: Response) {
    const { token } = verifyEmailParamsSchema.parse(req.params);
    const { password } = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: {
        passwordResetToken: token,
        passwordResetTokenExpiresAt: { gt: Date() },
      },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    await prisma.refreshTokens.deleteMany({
      where: { userId: user.id },
    });

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  }
  static async refreshToken(req: AuthRequest, res: Response) {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
      return;
    }

    const storedToken = await prisma.refreshTokens.findFirst({
      where: {
        userId: decoded.userId,
        token: refreshToken,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token not found or expired",
      });
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateToken({
      userId: decoded.userId,
      role: decoded.role,
    });

    await prisma.refreshTokens.delete({
      where: { id: storedToken.id },
    });

    await prisma.refreshTokens.create({
      data: {
        userId: decoded.userId,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
      },
    });
  }
  static async logout(req: AuthRequest, res: Response) {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
      return;
    }
    const storedToken = await prisma.refreshTokens.findFirst({
      where: { userId: decoded.userId, token: refreshToken },
    });

    if (!storedToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token not found",
      });
      return;
    }
    await prisma.refreshTokens.deleteMany({
      where: { userId: decoded.userId, token: refreshToken },
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
  }
}
