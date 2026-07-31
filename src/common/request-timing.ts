import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestHandler } from "express";
import { Prisma } from "@prisma/client";

type PhaseTiming = { count: number; elapsedMs: number };
type RequestTimingContext = {
  requestId: string;
  phases: Map<string, PhaseTiming>;
  prismaErrorCode: string | null;
};

const requestTimingStorage = new AsyncLocalStorage<RequestTimingContext>();

const errorCodeFor = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;

export const requestTimingMiddleware: RequestHandler = (
  request,
  response,
  next,
) => {
  const requestId = randomUUID();
  const startedAt = performance.now();
  const context: RequestTimingContext = {
    requestId,
    phases: new Map(),
    prismaErrorCode: null,
  };
  request.requestId = requestId;
  response.setHeader("X-Request-ID", requestId);
  response.once("finish", () => {
    let route = request.originalUrl.split("?", 1)[0] ?? request.path;
    for (const [name, value] of Object.entries(request.params)) {
      for (const parameter of Array.isArray(value) ? value : [value]) {
        route = route.replace(encodeURIComponent(parameter), `:${name}`);
        route = route.replace(parameter, `:${name}`);
      }
    }
    console.info("[http-request-timing]", {
      requestId,
      method: request.method,
      route,
      statusCode: response.statusCode,
      totalDurationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      databasePhases: Object.fromEntries(context.phases),
      prismaErrorCode: context.prismaErrorCode,
    });
  });
  requestTimingStorage.run(context, next);
};

export const databasePhase = async <T>(
  phase: string,
  callback: () => Promise<T>,
): Promise<T> => {
  const startedAt = performance.now();
  try {
    return await callback();
  } catch (error) {
    const context = requestTimingStorage.getStore();
    if (context) context.prismaErrorCode = errorCodeFor(error);
    throw error;
  } finally {
    const context = requestTimingStorage.getStore();
    if (context) {
      const previous = context.phases.get(phase) ?? { count: 0, elapsedMs: 0 };
      context.phases.set(phase, {
        count: previous.count + 1,
        elapsedMs:
          Math.round(
            (previous.elapsedMs + performance.now() - startedAt) * 100,
          ) / 100,
      });
    }
  }
};

export const recordRequestPrismaError = (error: unknown) => {
  const context = requestTimingStorage.getStore();
  if (context) context.prismaErrorCode = errorCodeFor(error);
};
