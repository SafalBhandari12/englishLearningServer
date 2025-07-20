import { Router } from "express";
import authRouter from "./authRoutes.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AuthRequest } from "../types/index.js";
import userRouter from "./userRoute.js"

const router = Router();

// Mount auth routes under /auth
router.use("/auth", authRouter);

router.use("/user", userRouter);

router.get(
  "/protected",
  asyncHandler(isAuthenticated),
  (req: AuthRequest, res) => {
    res.status(200).json({
      success: true,
      message: "Protected route accessed",
      user: req.user,
    });
  }
);

// Health check
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
