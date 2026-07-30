import { createHash } from "node:crypto";

import type {
  SendWhatsAppMessageInput,
  SendWhatsAppMessageResult,
  WhatsAppProvider,
} from "../whatsapp.types.js";

const maskedNumber = (number: string) =>
  number.length > 4 ? `***${number.slice(-4)}` : "***";

export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "mock";

  async sendMessage(
    input: SendWhatsAppMessageInput,
  ): Promise<SendWhatsAppMessageResult> {
    console.info(
      `[mock-whatsapp] sending fixture notification to ${maskedNumber(input.to)}`,
    );
    if (input.to.endsWith("0000")) {
      return {
        success: false,
        errorCode: "MOCK_SIMULATED_FAILURE",
        errorMessage: "Mock provider simulated a send failure",
        providerResponse: { simulated: true },
      };
    }
    const suffix = createHash("sha256")
      .update(input.idempotencyKey)
      .digest("hex")
      .slice(0, 16);
    return {
      success: true,
      providerMessageId: `mock-${suffix}`,
      providerResponse: { accepted: true },
    };
  }
}
