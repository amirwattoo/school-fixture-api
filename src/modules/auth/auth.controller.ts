import type { RequestHandler } from "express";

import { ApiError } from "../../common/api-error.js";
import { sendSuccess } from "../../common/response.js";
import { authService } from "./auth.service.js";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, resetPasswordSchema, updateProfileSchema } from "./auth.schemas.js";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "./token.service.js";

export const login: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body);
  const result = await authService.login(input.email, input.password);
  response.cookie(
    REFRESH_COOKIE_NAME,
    result.refreshToken,
    refreshCookieOptions,
  );
  sendSuccess(
    response,
    { accessToken: result.accessToken, user: result.user },
    "Login successful",
  );
};

export const refresh: RequestHandler = async (request, response) => {
  const rawToken = request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (!rawToken) {
    throw new ApiError(401, "REFRESH_TOKEN_MISSING", "Please sign in again");
  }
  const result = await authService.refresh(rawToken);
  response.cookie(
    REFRESH_COOKIE_NAME,
    result.refreshToken,
    refreshCookieOptions,
  );
  sendSuccess(
    response,
    { accessToken: result.accessToken, user: result.user },
    "Session refreshed",
  );
};

export const logout: RequestHandler = async (request, response) => {
  await authService.logout(
    request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined,
  );
  response.clearCookie(REFRESH_COOKIE_NAME, {
    ...refreshCookieOptions,
    maxAge: undefined,
  });
  sendSuccess(response, {}, "Logout successful");
};

export const forgotPassword: RequestHandler = async (request, response) => {
  const startedAt = performance.now();
  const { email } = forgotPasswordSchema.parse(request.body);
  await authService.requestPasswordReset(email, { ip: request.ip, userAgent: request.get("user-agent") });
  const remainingDelay = 200 - (performance.now() - startedAt);
  if (remainingDelay > 0) await new Promise((resolve) => setTimeout(resolve, remainingDelay));
  sendSuccess(response, {}, "If an account exists for this email, password reset instructions have been sent.");
};

export const resetPassword: RequestHandler = async (request, response) => {
  const input = resetPasswordSchema.parse(request.body);
  await authService.resetPassword(input.token, input.newPassword);
  sendSuccess(response, {}, "Password reset successful. You can now sign in.");
};

export const updateProfile: RequestHandler = async (request, response) => {
  const user = await authService.updateProfile(request.auth!.userId, request.auth!.schoolId, updateProfileSchema.parse(request.body));
  sendSuccess(response, { user }, "Profile updated");
};

export const me: RequestHandler = async (request, response) => {
  const auth = request.auth!;
  sendSuccess(
    response,
    { user: await authService.me(auth.userId, auth.schoolId) },
    "Current user retrieved",
  );
};

export const changePassword: RequestHandler = async (request, response) => {
  const auth = request.auth!;
  const input = changePasswordSchema.parse(request.body);
  await authService.changePassword(
    auth.userId,
    auth.schoolId,
    input.currentPassword,
    input.newPassword,
  );
  response.clearCookie(REFRESH_COOKIE_NAME, {
    ...refreshCookieOptions,
    maxAge: undefined,
  });
  sendSuccess(response, {}, "Password changed. Please sign in again");
};
