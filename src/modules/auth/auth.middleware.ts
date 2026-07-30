import type { RequestHandler } from "express";

import { ApiError } from "../../common/api-error.js";
import { verifyAccessToken } from "./token.service.js";

export const authenticate: RequestHandler = (request, _response, next) => {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    next(new ApiError(401, "UNAUTHORIZED", "Authorization header is missing"));
    return;
  }

  const payload = verifyAccessToken(authorization.slice(7));
  request.auth = {
    userId: payload.sub,
    schoolId: payload.schoolId,
    role: payload.role,
  };
  next();
};
