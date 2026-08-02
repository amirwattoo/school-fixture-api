import { config } from "dotenv";
import { z } from "zod";

config({ path: "../../.env" });
config();

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    API_PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
    COOKIE_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    FIXTURE_DEBUG_TIMING: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    PERF_LOGGING: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    EMAIL_PROVIDER: z.enum(["mock", "smtp"]).default("mock"),
    EMAIL_FROM: z.string().default("Proxy Management <no-reply@example.invalid>"),
    SMTP_HOST: z.string().optional().default(""),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    SMTP_USER: z.string().optional().default(""),
    SMTP_PASSWORD: z.string().optional().default(""),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(30),
    WHATSAPP_PROVIDER: z.enum(["mock", "meta"]).default("mock"),
    WHATSAPP_ACCESS_TOKEN: z.string().optional().default(""),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
    WHATSAPP_API_BASE_URL: z
      .string()
      .url()
      .default("https://graph.facebook.com"),
    WHATSAPP_API_VERSION: z.string().optional().default(""),
    WHATSAPP_TEMPLATE_NAME: z.string().optional().default(""),
    WHATSAPP_TEMPLATE_LANGUAGE: z.string().default("en"),
  })
  .superRefine((value, context) => {
    if (value.EMAIL_PROVIDER === "smtp" && (!value.SMTP_HOST.trim() || !value.SMTP_USER.trim() || !value.SMTP_PASSWORD)) {
      context.addIssue({ code: "custom", path: ["SMTP_HOST"], message: "SMTP host and credentials are required when EMAIL_PROVIDER=smtp" });
    }
    if (value.WHATSAPP_PROVIDER !== "meta") return;
    for (const key of [
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_API_VERSION",
      "WHATSAPP_TEMPLATE_NAME",
    ] as const) {
      if (!value[key].trim()) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when WHATSAPP_PROVIDER=meta`,
        });
      }
    }
  });

export const env = envSchema.parse(process.env);
