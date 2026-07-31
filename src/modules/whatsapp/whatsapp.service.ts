import { ApiError } from "../../common/api-error.js";
import { type AuditActor, createAuditLog } from "../../common/audit.js";
import { databasePhase } from "../../common/request-timing.js";
import { env } from "../../config/env.js";
import {
  buildWhatsAppClickToChatUrl,
  normalizePakistaniWhatsAppNumber,
} from "./whatsapp-number.util.js";
import {
  type NotificationFilters,
  whatsappRepository,
} from "./whatsapp.repository.js";

type NotificationRecord = NonNullable<
  Awaited<ReturnType<typeof whatsappRepository.find>>
>;

type ClickToChatDetails =
  | {
      clickToChatUrl: string;
      clickToChatError: null;
      normalizedDestination: string;
    }
  | {
      clickToChatUrl: null;
      clickToChatError: { code: string; message: string };
      normalizedDestination: string;
    };

const clickToChatDetails = (
  notification: NotificationRecord,
): ClickToChatDetails => {
  const number = notification.teacher.whatsappNumber;
  if (!number?.trim()) {
    return {
      clickToChatUrl: null,
      clickToChatError: {
        code: "WHATSAPP_NUMBER_MISSING",
        message: "The assigned teacher has no WhatsApp number.",
      },
      normalizedDestination: "",
    };
  }
  try {
    const normalizedDestination =
      normalizePakistaniWhatsAppNumber(number) ?? "";
    const clickToChatUrl = buildWhatsAppClickToChatUrl(
      normalizedDestination,
      notification.message,
    );
    if (env.NODE_ENV === "development") {
      console.info("[whatsapp-click-to-chat-url]", clickToChatUrl);
    }
    return {
      clickToChatUrl,
      clickToChatError: null,
      normalizedDestination,
    };
  } catch {
    return {
      clickToChatUrl: null,
      clickToChatError: {
        code: "WHATSAPP_NUMBER_INVALID",
        message: "The assigned teacher has an invalid WhatsApp number.",
      },
      normalizedDestination: number.slice(0, 30),
    };
  }
};

const safeNotification = (notification: NotificationRecord) => ({
  id: notification.id,
  fixtureId: notification.fixtureId,
  teacherId: notification.teacherId,
  destination: notification.destination,
  message: notification.message,
  status: notification.status,
  idempotencyKey: notification.idempotencyKey,
  attemptCount: notification.attemptCount,
  lastAttemptAt: notification.lastAttemptAt,
  openedAt: notification.openedAt,
  manuallyConfirmedAt: notification.manuallyConfirmedAt,
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt,
  teacher: notification.teacher,
  fixture: notification.fixture,
  ...clickToChatDetails(notification),
});

const findNotification = async (schoolId: string, notificationId: string) => {
  const notification = await whatsappRepository.find(schoolId, notificationId);
  if (!notification) {
    throw new ApiError(
      404,
      "WHATSAPP_NOTIFICATION_NOT_FOUND",
      "WhatsApp notification was not found",
    );
  }
  return notification;
};

export const whatsappService = {
  async list(schoolId: string, filters: NotificationFilters) {
    const result = await databasePhase("whatsapp-notification-list", () =>
      whatsappRepository.list(schoolId, filters),
    );
    return {
      notifications: result.notifications.map(safeNotification),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.pageSize),
      },
    };
  },

  async get(schoolId: string, notificationId: string) {
    return safeNotification(await findNotification(schoolId, notificationId));
  },

  providerStatus() {
    return {
      provider: "click_to_chat",
      mode: "Click-to-Chat",
      configured: true,
      automaticDelivery: false,
      deliveryConfirmation: "manual",
    };
  },

  async markOpened(notificationId: string, actor: AuditActor) {
    const existing = await findNotification(actor.schoolId, notificationId);
    const details = clickToChatDetails(existing);
    if (details.clickToChatError) {
      throw new ApiError(
        422,
        details.clickToChatError.code,
        details.clickToChatError.message,
      );
    }
    if (existing.status === "MANUALLY_CONFIRMED") {
      return safeNotification(existing);
    }
    const opened = await whatsappRepository.markOpened(
      existing.id,
      details.normalizedDestination,
    );
    await createAuditLog(
      actor,
      "WHATSAPP_CLICK_TO_CHAT_OPENED",
      "WhatsAppNotification",
      opened.id,
      {
        notificationId: opened.id,
        fixtureId: opened.fixtureId,
        teacherId: opened.teacherId,
      },
    );
    return safeNotification(opened);
  },

  async markManuallyConfirmed(notificationId: string, actor: AuditActor) {
    const existing = await findNotification(actor.schoolId, notificationId);
    if (existing.status === "MANUALLY_CONFIRMED") {
      return safeNotification(existing);
    }
    const confirmed = await whatsappRepository.markManuallyConfirmed(
      existing.id,
    );
    await createAuditLog(
      actor,
      "WHATSAPP_MANUALLY_CONFIRMED",
      "WhatsAppNotification",
      confirmed.id,
      {
        notificationId: confirmed.id,
        fixtureId: confirmed.fixtureId,
        teacherId: confirmed.teacherId,
      },
    );
    return safeNotification(confirmed);
  },
};
