import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { ApiError } from "../common/api-error.js";
import { recordRequestPrismaError } from "../common/request-timing.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  void _next;
  recordRequestPrismaError(error);

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "The request data is invalid",
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const knownErrors: Record<
      string,
      { status: number; code: string; message: string }
    > = {
      P2002: {
        status: 409,
        code: "DUPLICATE_RECORD",
        message: "The requested record already exists",
      },
      P2003: {
        status: 409,
        code: "RELATED_RECORD_CHANGED",
        message: "A related record changed or no longer exists; refresh and retry",
      },
      P2025: {
        status: 404,
        code: "RECORD_NOT_FOUND",
        message: "The requested record was not found",
      },
      P2024: {
        status: 503,
        code: "DATABASE_BUSY",
        message: "The database is busy; please try again shortly",
      },
      P2028: {
        status: 503,
        code: "DATABASE_TRANSACTION_EXPIRED",
        message: "The database operation took too long; please try again",
      },
      P2034: {
        status: 409,
        code: "DATABASE_WRITE_CONFLICT",
        message: "The data changed during this request; please try again",
      },
    };
    const known = knownErrors[error.code];
    if (known) {
      response.status(known.status).json({
        success: false,
        error: { code: known.code, message: known.message },
      });
      return;
    }
  }

  console.error("[request-error]", {
    type: error instanceof Error ? error.name : "UnknownError",
    prismaCode:
      error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null,
  });
  response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};
