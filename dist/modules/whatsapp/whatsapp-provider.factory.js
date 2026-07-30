import { env } from "../../config/env.js";
import { MetaWhatsAppCloudProvider } from "./providers/meta-whatsapp-cloud.provider.js";
import { MockWhatsAppProvider } from "./providers/mock-whatsapp.provider.js";
let provider;
export const getWhatsAppProvider = () => {
    provider ??=
        env.WHATSAPP_PROVIDER === "meta"
            ? new MetaWhatsAppCloudProvider()
            : new MockWhatsAppProvider();
    return provider;
};
//# sourceMappingURL=whatsapp-provider.factory.js.map