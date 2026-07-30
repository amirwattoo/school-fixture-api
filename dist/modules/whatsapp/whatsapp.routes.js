import { Router } from "express";
import { asyncHandler } from "../../common/async-handler.js";
import { authenticate } from "../auth/auth.middleware.js";
import { authorizeRoles } from "../auth/authorize-roles.middleware.js";
import { getNotification, getProviderStatus, listNotifications, markNotificationManuallyConfirmed, markNotificationOpened, } from "./whatsapp.controller.js";
export const whatsappRouter = Router();
whatsappRouter.use(authenticate, authorizeRoles("PRINCIPAL", "TIMETABLE_INCHARGE"));
whatsappRouter.get("/", asyncHandler(listNotifications));
whatsappRouter.get("/provider-status", asyncHandler(getProviderStatus));
whatsappRouter.get("/:notificationId", asyncHandler(getNotification));
whatsappRouter.post("/:notificationId/opened", asyncHandler(markNotificationOpened));
whatsappRouter.post("/:notificationId/confirm", asyncHandler(markNotificationManuallyConfirmed));
//# sourceMappingURL=whatsapp.routes.js.map