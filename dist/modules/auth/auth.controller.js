import { ApiError } from "../../common/api-error.js";
import { sendSuccess } from "../../common/response.js";
import { authService } from "./auth.service.js";
import { changePasswordSchema, loginSchema } from "./auth.schemas.js";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "./token.service.js";
export const login = async (request, response) => {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(input.email, input.password);
    response.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
    sendSuccess(response, { accessToken: result.accessToken, user: result.user }, "Login successful");
};
export const refresh = async (request, response) => {
    const rawToken = request.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawToken) {
        throw new ApiError(401, "REFRESH_TOKEN_MISSING", "Please sign in again");
    }
    const result = await authService.refresh(rawToken);
    response.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
    sendSuccess(response, { accessToken: result.accessToken, user: result.user }, "Session refreshed");
};
export const logout = async (request, response) => {
    await authService.logout(request.cookies?.[REFRESH_COOKIE_NAME]);
    response.clearCookie(REFRESH_COOKIE_NAME, {
        ...refreshCookieOptions,
        maxAge: undefined,
    });
    sendSuccess(response, {}, "Logout successful");
};
export const me = async (request, response) => {
    const auth = request.auth;
    sendSuccess(response, { user: await authService.me(auth.userId, auth.schoolId) }, "Current user retrieved");
};
export const changePassword = async (request, response) => {
    const auth = request.auth;
    const input = changePasswordSchema.parse(request.body);
    await authService.changePassword(auth.userId, auth.schoolId, input.currentPassword, input.newPassword);
    response.clearCookie(REFRESH_COOKIE_NAME, {
        ...refreshCookieOptions,
        maxAge: undefined,
    });
    sendSuccess(response, {}, "Password changed. Please sign in again");
};
//# sourceMappingURL=auth.controller.js.map