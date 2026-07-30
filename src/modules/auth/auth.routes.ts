import { Router } from "express";

import { asyncHandler } from "../../common/async-handler.js";
import {
  changePassword,
  login,
  logout,
  me,
  refresh,
} from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(login));
authRouter.post("/refresh", asyncHandler(refresh));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", authenticate, asyncHandler(me));
authRouter.patch(
  "/change-password",
  authenticate,
  asyncHandler(changePassword),
);
