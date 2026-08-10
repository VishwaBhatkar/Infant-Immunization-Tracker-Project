/**
 * File: backend/src/validators/childValidators.js
 * Purpose: Defines request-validation rules used to protect child API endpoints from invalid input.
 */
import { body, param } from 'express-validator';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genders = ['MALE', 'FEMALE', 'OTHER'];

const optionalDecimal = (field, label, min, max) =>
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min, max })
    .withMessage(`${label} must be between ${min} and ${max}`)
    .toFloat();

const validateChildDob = (value) => {
  const dob = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(dob.getTime())) {
    throw new Error('Enter a valid date of birth');
  }

  if (dob > today) {
    throw new Error('Date of birth cannot be in the future');
  }

  const oldestAllowedDob = new Date(today);
  oldestAllowedDob.setFullYear(oldestAllowedDob.getFullYear() - 5);

  if (dob < oldestAllowedDob) {
    throw new Error('Child age must be 5 years or less');
  }

  return true;
};

export const childIdRules = [
  param('id').isInt({ min: 1 }).withMessage('Invalid child ID').toInt()
];

export const createChildRules = [
  body('name').trim().notEmpty().withMessage('Child name is required').isLength({ max: 100 }).withMessage('Child name must not exceed 100 characters'),
  body('dob')
    .isISO8601({ strict: true }).withMessage('Date of birth must use YYYY-MM-DD')
    .custom(validateChildDob),
  body('gender').isIn(genders).withMessage('Gender must be MALE, FEMALE or OTHER'),
  body('blood_group').optional({ nullable: true, checkFalsy: true }).isIn(bloodGroups).withMessage('Select a valid blood group'),
  optionalDecimal('birth_weight_kg', 'Birth weight', 1, 5),
  optionalDecimal('current_weight_kg', 'Current weight', 0.3, 200),
  body('allergies').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('Allergies must not exceed 1000 characters'),
  body('medical_notes').optional({ nullable: true }).trim().isLength({ max: 3000 }).withMessage('Medical notes must not exceed 3000 characters'),
  body('profile_image_url').optional({ nullable: true, checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Profile image must be a valid HTTP or HTTPS URL')
];

export const updateChildRules = [
  ...childIdRules,
  body().custom((value) => {
    const allowed = ['name', 'dob', 'gender', 'blood_group', 'birth_weight_kg', 'current_weight_kg', 'allergies', 'medical_notes', 'profile_image_url'];
    if (!allowed.some((field) => Object.prototype.hasOwnProperty.call(value, field))) {
      throw new Error('Provide at least one child field to update');
    }
    return true;
  }),
  body('name').optional().trim().notEmpty().withMessage('Child name cannot be empty').isLength({ max: 100 }).withMessage('Child name must not exceed 100 characters'),
  body('dob').optional().isISO8601({ strict: true }).withMessage('Date of birth must use YYYY-MM-DD').custom(validateChildDob),
  body('gender').optional().isIn(genders).withMessage('Gender must be MALE, FEMALE or OTHER'),
  body('blood_group').optional({ nullable: true, checkFalsy: true }).isIn(bloodGroups).withMessage('Select a valid blood group'),
  optionalDecimal('birth_weight_kg', 'Birth weight', 1, 5),
  optionalDecimal('current_weight_kg', 'Current weight', 0.3, 200),
  body('allergies').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('Allergies must not exceed 1000 characters'),
  body('medical_notes').optional({ nullable: true }).trim().isLength({ max: 3000 }).withMessage('Medical notes must not exceed 3000 characters'),
  body('profile_image_url').optional({ nullable: true, checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Profile image must be a valid HTTP or HTTPS URL')
];
