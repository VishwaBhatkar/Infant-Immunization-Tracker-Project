import { body, param, query } from 'express-validator';

const dateRule = body('appointment_date').isISO8601({ strict: true }).withMessage('Appointment date must use YYYY-MM-DD');
const timeRule = body('appointment_time').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Appointment time must use HH:MM');

export const appointmentIdRules = [param('id').isInt({ min: 1 }).withMessage('Invalid appointment id')];
export const listAppointmentRules = [
  query('status').optional().isIn(['PENDING','CONFIRMED','COMPLETED','CANCELLED','REJECTED','RESCHEDULED']),
  query('scope').optional().isIn(['UPCOMING','PAST'])
];
export const availabilityRules = [
  query('hospital_id').isInt({ min: 1 }).withMessage('Hospital is required'),
  query('date').isISO8601({ strict: true }).withMessage('Valid date is required')
];
export const createAppointmentRules = [
  body('child_id').isInt({ min: 1 }),
  body('doctor_id').isInt({ min: 1 }),
  body('hospital_id').isInt({ min: 1 }),
  dateRule,
  timeRule,
  body('purpose').trim().isLength({ min: 3, max: 255 }).withMessage('Purpose must contain 3 to 255 characters'),
  body('notes').optional({ nullable: true }).isLength({ max: 2000 })
];
export const rescheduleRules = [dateRule, timeRule, body('notes').optional({ nullable: true }).isLength({ max: 2000 })];
export const statusRules = [
  body('status').isIn(['CONFIRMED','COMPLETED','CANCELLED','REJECTED']).withMessage('Invalid appointment status'),
  body('notes').optional({ nullable: true }).isLength({ max: 2000 })
];
