import type { SendWhatsAppMessageInput, SendWhatsAppMessageResult, WhatsAppProvider } from "../whatsapp.types.js";
export declare class MockWhatsAppProvider implements WhatsAppProvider {
    readonly name = "mock";
    sendMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult>;
}
//# sourceMappingURL=mock-whatsapp.provider.d.ts.map