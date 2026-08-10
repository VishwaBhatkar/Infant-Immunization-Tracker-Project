/**
 * File: backend/src/validators/reviewValidators.js
 * Purpose: Defines request-validation rules used to protect API endpoints from invalid input.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { body } from 'express-validator';

export const createReviewRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review_text').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('Review must not exceed 1000 characters'),
  body('is_anonymous').optional().isBoolean().withMessage('Anonymous value must be true or false'),
];
