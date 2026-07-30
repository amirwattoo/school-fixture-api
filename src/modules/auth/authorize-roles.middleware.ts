import type { UserRole } from "@prisma/client";
import type { RequestHandler } from "express";

import { ApiError } from "../../common/api-error.js";

export const authorizeRoles =
  (...roles: UserRole[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      next(
        new ApiError(
          403,
          "FORBIDDEN",
          "You do not have permission to perform this action",
        ),
      );
      return;
    }
    next();
  };
