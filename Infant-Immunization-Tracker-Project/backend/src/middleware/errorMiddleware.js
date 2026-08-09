/**
 * File: backend/src/middleware/errorMiddleware.js
 * Purpose: Provides reusable Express middleware for request validation, authorization, security, ownership, or error handling.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
// Handle requests for undefined routes
export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
};

// Handle application and database errors
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;

  // Convert common errors into user-friendly responses
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    err.message = 'Request body contains invalid JSON';
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    err.message =
      'A record with the same unique value already exists';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 422;
    err.message = 'A referenced record does not exist';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 409;
    err.message =
      'This record cannot be deleted because it is already in use';
  } else if (err.message === 'Origin is not allowed by CORS') {
    statusCode = 403;
  }

  const isProduction =
    process.env.NODE_ENV === 'production';

  // Log detailed errors only in non-production environments
  if (!isProduction) {
    console.error(err);
  }

  const response = {
    success: false,
    message:
      statusCode === 500 && isProduction
        ? 'Internal server error'
        : err.message || 'Internal server error'
  };

  // Include validation or field-specific errors when available
  if (
    Array.isArray(err.details) &&
    err.details.length
  ) {
    response.errors = err.details;
  }

  res.status(statusCode).json(response);
};