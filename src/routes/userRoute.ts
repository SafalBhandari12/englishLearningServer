import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
import { UserController } from "../controllers/candidateController.js";
import { upload } from "../utils/multer.js";

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

router.post(
  "/answer",
  asyncHandler(isAuthenticated),
  upload.single("wav"),
  asyncHandler(UserController.sendAnswer)
);
export default router;
