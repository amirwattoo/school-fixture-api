import { ApiError } from "../../common/api-error.js";
export const authorizeRoles = (...roles) => (request, _response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
        next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action"));
        return;
    }
    next();
};
//# sourceMappingURL=authorize-roles.middleware.js.map