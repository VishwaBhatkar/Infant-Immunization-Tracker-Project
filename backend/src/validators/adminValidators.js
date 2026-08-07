/**
 * File: backend/src/validators/adminValidators.js
 * Purpose: Defines request-validation rules used to protect API endpoints from invalid input.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { body, param, query } from 'express-validator';
import { ALL_ROLES } from '../constants/roles.js';

export const adminUserListRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 150 }).withMessage('search is too long'),
  query('role').optional().isIn(ALL_ROLES).withMessage('Invalid role'),
  query('status').optional().isIn(['active', 'inactive', 'deleted', 'all']).withMessage('Invalid status')
];

export const adminUserIdRules = [
  param('id').isInt({ min: 1 }).withMessage('Valid user id is required')
];

export const updateAdminUserStatusRules = [
  ...adminUserIdRules,
  body('is_active').isBoolean().withMessage('is_active must be true or false'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('reason is too long')
];

export const deleteAdminUserRules = [
  ...adminUserIdRules,
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('reason is too long')
];

export const adminDoctorListRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 150 }),
  query('status').optional().isIn(['active', 'inactive', 'deleted', 'all']),
  query('hospital_id').optional().isInt({ min: 1 })
];

export const adminDoctorIdRules = [param('id').isInt({ min: 1 }).withMessage('Valid doctor id is required')];

const doctorFields = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('phone').trim().isLength({ min: 7, max: 50 }),
  body('hospital_ids').optional().isArray({ max: 20 }),
  body('hospital_ids.*').isInt({ min: 1 })
];

export const createAdminDoctorRules = [
  ...doctorFields,
  body('password').isLength({ min: 8, max: 72 }).withMessage('Password must contain 8 to 72 characters')
];

export const updateAdminDoctorRules = [
  ...adminDoctorIdRules,
  ...doctorFields,
  body('reason').optional().trim().isLength({ max: 500 })
];

export const adminHospitalListRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 150 }),
  query('status').optional().isIn(['active', 'inactive', 'deleted', 'all'])
];

export const adminHospitalIdRules = [param('id').isInt({ min: 1 }).withMessage('Valid hospital id is required')];

const hospitalFields = [
  body('name').trim().isLength({ min: 2, max: 150 }),
  body('address').trim().isLength({ min: 5, max: 500 }),
  body('phone').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }),
  body('email').optional({ nullable: true, checkFalsy: true }).trim().isEmail().normalizeEmail(),
  body('opening_hours').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 255 })
];

export const createAdminHospitalRules = hospitalFields;
export const updateAdminHospitalRules = [
  ...adminHospitalIdRules,
  ...hospitalFields,
  body('reason').optional().trim().isLength({ max: 500 })
];

export const adminChildListRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 150 }),
  query('gender').optional().isIn(['MALE','FEMALE','OTHER']),
  query('parent_id').optional().isInt({ min: 1 })
];
export const adminChildIdRules = [param('id').isInt({ min: 1 }).withMessage('Valid child id is required')];

export const adminNotificationListRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 150 }),
  query('status').optional().isIn(['PENDING','PROCESSING','SENT','DELIVERED','FAILED','CANCELLED','SKIPPED']),
  query('type').optional().isIn(['VACCINE_DUE','VACCINE_OVERDUE','APPOINTMENT','GENERAL'])
];
export const adminNotificationIdRules = [param('id').isInt({ min: 1 }).withMessage('Valid notification id is required')];
export const sendAdminNotificationRules = [
  body('user_id').isInt({ min: 1 }),
  body('title').trim().isLength({ min: 2, max: 150 }),
  body('message').trim().isLength({ min: 2, max: 500 }),
  body('type').optional().isIn(['VACCINE_DUE','VACCINE_OVERDUE','APPOINTMENT','GENERAL']),
  body('scheduled_at').optional({ nullable:true }).isISO8601()
];
export const cancelAdminNotificationRules = [
  ...adminNotificationIdRules,
  body('reason').optional().trim().isLength({ max: 500 })
];

export const adminAccountListRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 150 }),
  query('role').optional().isIn(['SYSTEM_ADMIN', 'HOSPITAL_ADMIN']),
  query('status').optional().isIn(['active', 'inactive', 'deleted', 'all'])
];

export const adminAccountIdRules = [param('id').isInt({ min: 1 }).withMessage('Valid admin id is required')];

export const createAdminAccountRules = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('phone').trim().isLength({ min: 7, max: 50 }),
  body('password').isLength({ min: 8, max: 72 }),
  body('role').isIn(['SYSTEM_ADMIN', 'HOSPITAL_ADMIN']),
  body('hospital_id').optional({ nullable: true }).isInt({ min: 1 })
];

export const updateAdminAccountRules = [
  ...adminAccountIdRules,
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').trim().isEmail().normalizeEmail(),
  body('phone').trim().isLength({ min: 7, max: 50 }),
  body('role').isIn(['SYSTEM_ADMIN', 'HOSPITAL_ADMIN']),
  body('hospital_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('reason').optional().trim().isLength({ max: 500 })
];

export const resetAdminPasswordRules = [
  ...adminAccountIdRules,
  body('new_password').isLength({ min: 8, max: 72 }),
  body('reason').optional().trim().isLength({ max: 500 })
];
