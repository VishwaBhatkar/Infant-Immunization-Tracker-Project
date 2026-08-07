/**
 * File: backend/src/middleware/validationMiddleware.js
 * Purpose: Provides reusable Express middleware for request validation, authorization, security, ownership, or error handling.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { validationResult } from 'express-validator';
import { AppError } from '../utils/appError.js';

// Validate incoming request data
export const validate = (req, res, next) => {
  const result = validationResult(req);

  // Return validation errors if any request fields are invalid
  if (!result.isEmpty()) {
    const errors = result
      .array({ onlyFirstError: true })
      .map((error) => ({
        field: error.path,
        message: error.msg
      }));

    return next(
      new AppError(
        'Validation failed',
        422,
        errors
      )
    );
  }

  next();
};