import { env } from "../../config/env.js";
import { MetaWhatsAppCloudProvider } from "./providers/meta-whatsapp-cloud.provider.js";
import { MockWhatsAppProvider } from "./providers/mock-whatsapp.provider.js";
import type { WhatsAppProvider } from "./whatsapp.types.js";

let provider: WhatsAppProvider | undefined;

export const getWhatsAppProvider = (): WhatsAppProvider => {
  provider ??=
    env.WHATSAPP_PROVIDER === "meta"
      ? new MetaWhatsAppCloudProvider()
      : new MockWhatsAppProvider();
  return provider;
};
