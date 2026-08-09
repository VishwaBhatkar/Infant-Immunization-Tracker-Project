/**
 * File: backend/src/validators/profileValidators.js
 * Purpose: Defines request-validation rules used to protect API endpoints from invalid input.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { body } from 'express-validator';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const updateProfileRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must contain between 2 and 100 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage('Enter a valid mobile number containing 10 to 15 digits'),
  body('avatar_url')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Profile image URL must be valid'),
  body('dark_mode')
    .optional()
    .isBoolean()
    .withMessage('Dark mode must be true or false')
];

export const changePasswordRules = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password')
    .matches(passwordPattern)
    .withMessage('New password must be at least 8 characters and include uppercase, lowercase, number and special character'),
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) throw new Error('New password and confirm password do not match');
      return true;
    })
];

export const deleteAccountRules = [
  body('password').notEmpty().withMessage('Password is required to delete the account')
];
