/**
 * File: backend/src/utils/AppError.js
 * Purpose: Provides reusable helper functions shared across multiple modules.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
/**
 * Operational application error used by controllers and middleware.
 * Both named and default exports are provided because the existing
 * codebase uses both import styles.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, AppError);
  }
}

export { AppError };
export default AppError;
