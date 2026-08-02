import nodemailer from "nodemailer";

import { env } from "../../config/env.js";

export type PasswordResetMessage = { to: string; resetUrl: string; recipientName: string };

export interface EmailProvider {
  sendPasswordReset(message: PasswordResetMessage): Promise<void>;
}

const textFor = (message: PasswordResetMessage) =>
  `Hello ${message.recipientName},\n\nA password reset was requested for your Proxy Management account. Open this link within ${env.PASSWORD_RESET_TTL_MINUTES} minutes:\n${message.resetUrl}\n\nIf you did not request this, you can ignore this email.`;

const mockProvider: EmailProvider = {
  async sendPasswordReset() {
    // Intentionally do not print reset links or recipient data.
  },
};

const smtpProvider: EmailProvider = {
  async sendPasswordReset(message) {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transport.sendMail({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: "Reset your Proxy Management password",
      text: textFor(message),
    });
  },
};

export const emailProvider: EmailProvider = env.EMAIL_PROVIDER === "smtp" ? smtpProvider : mockProvider;
