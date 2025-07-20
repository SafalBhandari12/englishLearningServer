import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../utils/database.js";
import { userRole } from "@prisma/client";

interface JwtPayload {
  userId: string;
  type: "access" | "refresh";
  role: userRole;
  iat?: number;
  exp?: number;
}

interface AuthRequest extends Request {
  user?: {
    userId: string;
    type: "access" | "refresh";
    role: userRole;
    iat?: number;
    exp?: number;
  };
}

export const isAuthenticated = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  const decoded = jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET!
  ) as JwtPayload;

  if (decoded.type !== "access") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
    },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.emailVerified === false) {
    return res.status(403).json({
      success: false,
      message: "Email not verified",
    });
  }

  req.user = decoded;
  next();
};
