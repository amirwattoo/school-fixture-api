import { createHash, randomUUID } from "node:crypto";

import type { UserRole } from "@prisma/client";
import jwt from "jsonwebtoken";

import { ApiError } from "../../common/api-error.js";
import { env } from "../../config/env.js";

export const REFRESH_COOKIE_NAME = "school_fixture_refresh";

export type AuthTokenPayload = {
  sub: string;
  schoolId: string;
  role: UserRole;
};

const durationToSeconds = (value: string): number => {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) {
    throw new Error(`Invalid token expiry duration: ${value}`);
  }

  const amount = Number(match[1]);
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]!]!;
  return amount * multiplier;
};

export const refreshLifetimeSeconds = durationToSeconds(
  env.JWT_REFRESH_EXPIRES_IN,
);

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const signAccessToken = (payload: AuthTokenPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: durationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
  });

export const signRefreshToken = (payload: AuthTokenPayload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: refreshLifetimeSeconds,
    jwtid: randomUUID(),
  });

const validatePayload = (
  payload: string | jwt.JwtPayload,
): AuthTokenPayload => {
  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.schoolId !== "string" ||
    (payload.role !== "PRINCIPAL" && payload.role !== "TIMETABLE_INCHARGE")
  ) {
    throw new ApiError(401, "INVALID_TOKEN", "The token is invalid");
  }

  return {
    sub: payload.sub,
    schoolId: payload.schoolId,
    role: payload.role,
  };
};

export const verifyAccessToken = (token: string) => {
  try {
    return validatePayload(jwt.verify(token, env.JWT_ACCESS_SECRET));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "INVALID_TOKEN", "The access token is invalid");
  }
};

export const verifyRefreshToken = (token: string) => {
  try {
    return validatePayload(jwt.verify(token, env.JWT_REFRESH_SECRET));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Please sign in again");
  }
};

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax" as const,
  path: "/api/v1/auth",
  maxAge: refreshLifetimeSeconds * 1000,
};
