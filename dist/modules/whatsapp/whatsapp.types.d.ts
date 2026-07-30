export interface SendWhatsAppMessageInput {
    to: string;
    message: string;
    idempotencyKey: string;
    templateParameters?: string[];
}
export interface SendWhatsAppMessageResult {
    success: boolean;
    providerMessageId?: string;
    providerResponse?: unknown;
    errorCode?: string;
    errorMessage?: string;
}
export interface WhatsAppProvider {
    readonly name: string;
    sendMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult>;
}
export type PublicationNotificationSummary = {
    publishedCount: number;
    notificationsCreated: number;
    messagesReady: number;
    messagesSent: number;
    messagesFailed: number;
    existingNotifications: number;
};
//# sourceMappingURL=whatsapp.types.d.ts.map