import { createHash } from "node:crypto";
import type { RequestHandler } from "express";

import { ApiError } from "../../common/api-error.js";

const attempts = new Map<string, number[]>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

export const passwordResetRateLimit: RequestHandler = (request, _response, next) => {
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const key = createHash("sha256").update(`${request.ip}|${email}`).digest("hex");
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => time > now - WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    next(new ApiError(429, "RESET_RATE_LIMITED", "Too many requests. Please try again later."));
    return;
  }
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 2_000) {
    for (const [storedKey, times] of attempts) if (!times.some((time) => time > now - WINDOW_MS)) attempts.delete(storedKey);
  }
  next();
};
