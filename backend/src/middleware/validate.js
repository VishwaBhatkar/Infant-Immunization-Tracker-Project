import { validationResult } from 'express-validator';
import { AppError } from '../utils/AppError.js';

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