/**
 * File: backend/src/middleware/securityMiddleware.js
 * Purpose: Provides reusable Express middleware for request validation, authorization, security, ownership, or error handling.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import crypto from 'node:crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Attach a unique request ID to every request
export const requestContext = (req, res, next) => {
  const suppliedId = req.get('x-request-id');

  const requestId =
    suppliedId && suppliedId.length <= 100
      ? suppliedId
      : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
};

// Disable caching for admin responses
export const adminNoStore = (req, res, next) => {
  res.setHeader(
    'Cache-Control',
    'no-store, max-age=0'
  );
  res.setHeader('Pragma', 'no-cache');

  next();
};

// Limit the number of admin requests per user and IP
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: Number(
    process.env.ADMIN_RATE_LIMIT || 120
  ),

  standardHeaders: 'draft-8',
  legacyHeaders: false,

  // Generate a rate-limit key using IP and authenticated user ID
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip)}:${
      req.user?.id || 'anonymous'
    }`,

  message: {
    success: false,
    message:
      'Too many Admin requests. Please try again later.'
  }
});