import { Router } from "express";
import { asyncHandler } from "../../common/async-handler.js";
import { authenticate } from "../auth/auth.middleware.js";
import { authorizeRoles } from "../auth/authorize-roles.middleware.js";
import { createClassSection, disableClassSection, getClassSection, listClassSections, updateClassSection, } from "./class-sections.controller.js";
export const classSectionsRouter = Router();
classSectionsRouter.use(authenticate, authorizeRoles("PRINCIPAL", "TIMETABLE_INCHARGE"));
classSectionsRouter.get("/", asyncHandler(listClassSections));
classSectionsRouter.post("/", asyncHandler(createClassSection));
classSectionsRouter.get("/:classSectionId", asyncHandler(getClassSection));
classSectionsRouter.patch("/:classSectionId", asyncHandler(updateClassSection));
classSectionsRouter.delete("/:classSectionId", asyncHandler(disableClassSection));
//# sourceMappingURL=class-sections.routes.js.map