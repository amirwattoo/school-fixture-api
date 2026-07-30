import { env } from "../../../config/env.js";
import { sanitizeProviderResponse } from "./provider-response.util.js";
const REQUEST_TIMEOUT_MS = 10_000;
export class MetaWhatsAppCloudProvider {
    name = "meta";
    async sendMessage(input) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const endpoint = `${env.WHATSAPP_API_BASE_URL.replace(/\/$/, "")}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
                signal: controller.signal,
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: input.to.replace(/^\+/, ""),
                    type: "template",
                    template: {
                        name: env.WHATSAPP_TEMPLATE_NAME,
                        language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
                        components: [
                            {
                                type: "body",
                                parameters: (input.templateParameters ?? []).map((text) => ({
                                    type: "text",
                                    text,
                                })),
                            },
                        ],
                    },
                }),
            });
            const body = await response.json().catch(() => ({
                status: response.status,
            }));
            const safeResponse = sanitizeProviderResponse(body);
            if (!response.ok) {
                return {
                    success: false,
                    errorCode: response.status === 401 || response.status === 403
                        ? "WHATSAPP_PROVIDER_UNAUTHORIZED"
                        : "WHATSAPP_SEND_FAILED",
                    errorMessage: "Meta WhatsApp rejected the message",
                    providerResponse: safeResponse,
                };
            }
            const messageId = typeof body === "object" &&
                body !== null &&
                Array.isArray(body.messages)
                ? (body.messages[0]?.id ??
                    undefined)
                : undefined;
            return {
                success: true,
                providerMessageId: typeof messageId === "string" ? messageId : undefined,
                providerResponse: safeResponse,
            };
        }
        catch (error) {
            const timedOut = error instanceof Error && error.name === "AbortError";
            return {
                success: false,
                errorCode: timedOut
                    ? "WHATSAPP_PROVIDER_TIMEOUT"
                    : "WHATSAPP_SEND_FAILED",
                errorMessage: timedOut
                    ? "The WhatsApp provider request timed out"
                    : "The WhatsApp provider request failed",
            };
        }
        finally {
            clearTimeout(timeout);
        }
    }
}
//# sourceMappingURL=meta-whatsapp-cloud.provider.js.map