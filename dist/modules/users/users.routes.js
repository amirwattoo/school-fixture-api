import { Router } from "express";
import { asyncHandler } from "../../common/async-handler.js";
import { authenticate } from "../auth/auth.middleware.js";
import { authorizeRoles } from "../auth/authorize-roles.middleware.js";
import { createUser, listUsers, updateUser } from "./users.controller.js";
export const usersRouter = Router();
usersRouter.use(authenticate, authorizeRoles("PRINCIPAL"));
usersRouter.get("/", asyncHandler(listUsers));
usersRouter.post("/", asyncHandler(createUser));
usersRouter.patch("/:userId", asyncHandler(updateUser));
//# sourceMappingURL=users.routes.js.map