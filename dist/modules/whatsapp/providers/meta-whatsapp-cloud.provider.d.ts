import type { SendWhatsAppMessageInput, SendWhatsAppMessageResult, WhatsAppProvider } from "../whatsapp.types.js";
export declare class MetaWhatsAppCloudProvider implements WhatsAppProvider {
    readonly name = "meta";
    sendMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult>;
}
//# sourceMappingURL=meta-whatsapp-cloud.provider.d.ts.map