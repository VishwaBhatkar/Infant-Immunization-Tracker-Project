import { body, param, query } from 'express-validator';

export const childScheduleIdRules = [
  param('childId').isInt({ min: 1 }).withMessage('A valid child ID is required')
];

export const generateScheduleRules = [
  ...childScheduleIdRules,
  body('force').optional().isBoolean().withMessage('force must be true or false')
];

export const scheduleListRules = [
  query('child_id').optional().isInt({ min: 1 }).withMessage('child_id must be valid'),
  query('status').optional().isIn(['UPCOMING','DUE','OVERDUE','COMPLETED','MISSED','CANCELLED']).withMessage('Invalid schedule status')
];
