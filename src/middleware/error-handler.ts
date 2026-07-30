import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { ApiError } from "../common/api-error.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  void _next;

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

  console.error(error);
  response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};
