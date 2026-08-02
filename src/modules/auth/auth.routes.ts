import { Router } from "express";

import { asyncHandler } from "../../common/async-handler.js";
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  resetPassword,
  updateProfile,
} from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";
import { passwordResetRateLimit } from "./password-reset-rate-limit.js";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(login));
authRouter.post("/forgot-password", passwordResetRateLimit, asyncHandler(forgotPassword));
authRouter.post("/reset-password", asyncHandler(resetPassword));
authRouter.post("/refresh", asyncHandler(refresh));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", authenticate, asyncHandler(me));
authRouter.patch("/profile", authenticate, asyncHandler(updateProfile));
authRouter.patch(
  "/change-password",
  authenticate,
  asyncHandler(changePassword),
);
