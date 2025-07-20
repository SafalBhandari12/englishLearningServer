import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
import { UserController } from "../controllers/candidateController.js";

const router = Router();

router.get(
  "/",
  asyncHandler(isAuthenticated),
  asyncHandler(UserController.me).bind(UserController)
);

router.post(
  "/register",
  asyncHandler(isAuthenticated),
  asyncHandler(UserController.completeRegistration)
);

export default router;
