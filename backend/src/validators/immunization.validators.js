import { body, param, query } from 'express-validator';

const dateOptional = (field, label) => body(field).optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage(`${label} must use YYYY-MM-DD`);

export const recordListRules = [
  query('child_id').optional().isInt({ min: 1 }).withMessage('Child ID must be valid'),
  query('schedule_id').optional().isInt({ min: 1 }).withMessage('Schedule ID must be valid')
];

export const recordIdRules = [param('id').isInt({ min: 1 }).withMessage('Record ID must be valid')];

export const createRecordRules = [
  body('schedule_id').isInt({ min: 1 }).withMessage('Vaccination schedule is required'),
  body('vaccination_date').isISO8601().withMessage('Vaccination date must use YYYY-MM-DD'),
  body('hospital_id').isInt({ min: 1 }).withMessage('Hospital is required'),
  body('doctor_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Doctor ID must be valid'),
  body('batch_number').optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }).withMessage('Batch number is too long'),
  dateOptional('expiry_date', 'Expiry date'),
  body('injection_site').optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }).withMessage('Injection site is too long'),
  body('notes').optional({ nullable: true, checkFalsy: true }).isLength({ max: 2000 }).withMessage('Notes are too long'),
  dateOptional('next_dose_date', 'Next dose date'),
  body('proof_image_url').optional({ nullable: true, checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('Proof image must be a valid HTTP or HTTPS URL')
];

export const updateRecordRules = [
  ...recordIdRules,
  dateOptional('vaccination_date', 'Vaccination date'),
  body('hospital_id').optional().isInt({ min: 1 }).withMessage('Hospital ID must be valid'),
  body('doctor_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Doctor ID must be valid'),
  body('batch_number').optional({ nullable: true }).isLength({ max: 100 }).withMessage('Batch number is too long'),
  dateOptional('expiry_date', 'Expiry date'),
  body('injection_site').optional({ nullable: true }).isLength({ max: 100 }).withMessage('Injection site is too long'),
  body('notes').optional({ nullable: true }).isLength({ max: 2000 }).withMessage('Notes are too long'),
  dateOptional('next_dose_date', 'Next dose date'),
  body('proof_image_url').optional({ nullable: true }).custom((value) => !value || /^https?:\/\//i.test(value)).withMessage('Proof image must be a valid HTTP or HTTPS URL')
];
