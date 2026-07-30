import { sendSuccess } from "../../common/response.js";
import { notificationIdSchema, notificationListSchema, } from "./whatsapp.schemas.js";
import { whatsappService } from "./whatsapp.service.js";
export const listNotifications = async (request, response) => {
    const filters = notificationListSchema.parse(request.query);
    sendSuccess(response, await whatsappService.list(request.auth.schoolId, filters), "WhatsApp notifications retrieved");
};
export const getNotification = async (request, response) => {
    const { notificationId } = notificationIdSchema.parse(request.params);
    sendSuccess(response, {
        notification: await whatsappService.get(request.auth.schoolId, notificationId),
    }, "WhatsApp notification retrieved");
};
export const markNotificationOpened = async (request, response) => {
    const { notificationId } = notificationIdSchema.parse(request.params);
    sendSuccess(response, {
        notification: await whatsappService.markOpened(notificationId, request.auth),
    }, "WhatsApp Click-to-Chat opened");
};
export const markNotificationManuallyConfirmed = async (request, response) => {
    const { notificationId } = notificationIdSchema.parse(request.params);
    sendSuccess(response, {
        notification: await whatsappService.markManuallyConfirmed(notificationId, request.auth),
    }, "WhatsApp message manually confirmed");
};
export const getProviderStatus = (_request, response) => {
    sendSuccess(response, { provider: whatsappService.providerStatus() }, "WhatsApp provider status retrieved");
};
//# sourceMappingURL=whatsapp.controller.js.map