import type { ApiErrorResponse } from "@codesense/shared";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { formatZodIssues } from "../utils/zod-error.js";

interface MongoErrorLike {
  name?: string;
  code?: number;
  message?: string;
}

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  _next
): void => {
  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "Internal server error";
  let details: unknown;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 422;
    code = "VALIDATION_ERROR";
    message = "Invalid request";
    details = formatZodIssues(error);
  } else if ((error as MongoErrorLike)?.name === "ValidationError") {
    statusCode = 422;
    code = "VALIDATION_ERROR";
    message = (error as MongoErrorLike).message ?? "Validation failed";
  } else if ((error as MongoErrorLike)?.name === "CastError") {
    statusCode = 400;
    code = "INVALID_IDENTIFIER";
    message = "Invalid identifier";
  } else if ((error as MongoErrorLike)?.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_KEY";
    message = "Resource already exists";
  }

  if (
    statusCode >= 500 &&
    details === undefined &&
    env.NODE_ENV !== "production" &&
    error instanceof Error
  ) {
    details = { stack: error.stack };
  }

  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {})
    }
  };

  const logMeta = {
    err: error,
    method: req.method,
    url: req.originalUrl,
    statusCode
  };

  if (statusCode >= 500) {
    logger.error(logMeta, message);
  } else {
    logger.warn(logMeta, message);
  }

  res.status(statusCode).json(body);
};
