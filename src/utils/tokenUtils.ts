import jwt from "jsonwebtoken";
import crypto from "crypto";
import { userRole } from "@prisma/client";

interface jwtPayload {
  userId: string;
  type: "access" | "refresh";
  role: userRole;
}

export const generateToken = async (data: {
  userId: string;
  role: userRole;
}) => {
  const { userId, role } = data;
  const accessTokenPayload: jwtPayload = {
    userId,
    role,
    type: "access",
  };
  const accessToken = jwt.sign(
    accessTokenPayload,
    process.env.JWT_ACCESS_SECRET || "my-secret-token",
    {
      expiresIn: "15m",
    }
  );

  const refreshTokenPayload: jwtPayload = {
    userId,
    role: role,
    type: "refresh",
  };

  const refreshToken = jwt.sign(
    refreshTokenPayload,
    process.env.JWT_REFRESH_SECRET || "my-secret-token",
    {
      expiresIn: "7d",
    }
  );

  return { accessToken, refreshToken };
};

export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const verifyRefreshToken = (token: string): jwtPayload | null => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET!
    ) as jwtPayload;
    return decoded.type === "refresh" ? decoded : null;
  } catch (error) {
    return null;
  }
};

export const verifyAccessToken = (token: string): jwtPayload | null => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET!
    ) as jwtPayload;
    return decoded.type === "access" ? decoded : null;
  } catch (error) {
    return null;
  }
};
