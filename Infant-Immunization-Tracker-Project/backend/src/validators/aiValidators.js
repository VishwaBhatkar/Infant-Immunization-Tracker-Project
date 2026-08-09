/**
 * File: backend/src/validators/aiValidators.js
 * Purpose: Defines request-validation rules used to protect API endpoints from invalid input.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { body } from 'express-validator';

export const vaccinationChatRules = [
  body('question').isString().trim().notEmpty().withMessage('Question is required').isLength({ max: 500 }).withMessage('Question must be 500 characters or fewer'),
  body('childId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('childId must be a positive integer'),
  body('language').optional().isIn(['English', 'Hindi', 'Marathi']).withMessage('Unsupported language')
];
