/**
 * File: backend/src/validators/vaccineValidators.js
 * Purpose: Defines request-validation rules used to protect API endpoints from invalid input.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { body, param, query } from 'express-validator';

const optionalText = (field, max) => body(field).optional({ nullable: true }).isString().trim().isLength({ max });

export const vaccineListRules = [
  query('search').optional().isString().trim().isLength({ max: 120 }).withMessage('Search must be 120 characters or fewer'),
  query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'ALL']).withMessage('Status must be ACTIVE, INACTIVE or ALL'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

export const vaccineIdRules = [
  param('id').isInt({ min: 1 }).withMessage('A valid vaccine ID is required')
];

export const createVaccineRules = [
  body('name').isString().trim().notEmpty().withMessage('Vaccine name is required').isLength({ max: 120 }).withMessage('Vaccine name must be 120 characters or fewer'),
  optionalText('description', 2000),
  optionalText('disease_prevented', 255),
  body('recommended_age_days').isInt({ min: 0, max: 36500 }).withMessage('Recommended age must be between 0 and 36500 days'),
  body('dose_number').optional().isInt({ min: 1, max: 20 }).withMessage('Dose number must be between 1 and 20'),
  body('gap_between_doses_days').optional({ nullable: true }).isInt({ min: 0, max: 3650 }).withMessage('Dose gap must be between 0 and 3650 days'),
  body('administration_route').optional({ nullable: true }).isIn(['ORAL', 'INTRAMUSCULAR', 'SUBCUTANEOUS', 'INTRADERMAL', 'OTHER']).withMessage('Select a valid administration route'),
  body('is_active').optional().isBoolean().withMessage('Active status must be true or false')
];

export const updateVaccineRules = [
  ...vaccineIdRules,
  body().custom((value) => {
    const allowed = ['name', 'description', 'disease_prevented', 'recommended_age_days', 'dose_number', 'gap_between_doses_days', 'administration_route', 'is_active'];
    if (!allowed.some((field) => Object.prototype.hasOwnProperty.call(value, field))) {
      throw new Error('Provide at least one vaccine field to update');
    }
    return true;
  }),
  body('name').optional().isString().trim().notEmpty().withMessage('Vaccine name cannot be empty').isLength({ max: 120 }).withMessage('Vaccine name must be 120 characters or fewer'),
  optionalText('description', 2000),
  optionalText('disease_prevented', 255),
  body('recommended_age_days').optional().isInt({ min: 0, max: 36500 }).withMessage('Recommended age must be between 0 and 36500 days'),
  body('dose_number').optional().isInt({ min: 1, max: 20 }).withMessage('Dose number must be between 1 and 20'),
  body('gap_between_doses_days').optional({ nullable: true }).isInt({ min: 0, max: 3650 }).withMessage('Dose gap must be between 0 and 3650 days'),
  body('administration_route').optional({ nullable: true }).isIn(['ORAL', 'INTRAMUSCULAR', 'SUBCUTANEOUS', 'INTRADERMAL', 'OTHER']).withMessage('Select a valid administration route'),
  body('is_active').optional().isBoolean().withMessage('Active status must be true or false')
];
