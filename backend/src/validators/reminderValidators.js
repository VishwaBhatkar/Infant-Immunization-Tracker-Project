/**
 * File: backend/src/validators/reminderValidators.js
 * Purpose: Defines request-validation rules used to protect API endpoints from invalid input.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { body, query } from 'express-validator';
const dayList=/^(?:\d+)(?:,\d+)*$/;
export const preferenceRules=[
 body('push_enabled').isBoolean(),body('vaccination_reminders_enabled').isBoolean(),body('appointment_reminders_enabled').isBoolean(),body('overdue_reminders_enabled').isBoolean(),
 body('vaccine_reminder_days').matches(dayList).withMessage('Use comma-separated day numbers, for example 7,3,1,0'),
 body('appointment_reminder_days').matches(dayList).withMessage('Use comma-separated day numbers, for example 1,0'),
 body('overdue_interval_days').isInt({min:1,max:30})
];
export const logRules=[query('status').optional().isIn(['PENDING','SENT','FAILED','SKIPPED']),query('page').optional().isInt({min:1}),query('limit').optional().isInt({min:1,max:100})];
