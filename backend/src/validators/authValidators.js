/**
 * File: backend/src/validators/authValidators.js
 * Purpose: Defines request-validation rules used to protect API endpoints from invalid input.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { body } from 'express-validator';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .isMobilePhone('any').withMessage('Enter a valid mobile number'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .matches(passwordPattern)
    .withMessage('Password must be at least 8 characters and include uppercase, lowercase, number and special character'),
  body('confirm_password')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password and confirm password do not match');
      }
      return true;
    }),
  body('role')
    .notEmpty().withMessage('Account role is required')
    .customSanitizer((value) => String(value).trim().toUpperCase())
    .isIn(['PARENT', 'DOCTOR'])
    .withMessage('Role must be PARENT or DOCTOR')
];

export const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];
