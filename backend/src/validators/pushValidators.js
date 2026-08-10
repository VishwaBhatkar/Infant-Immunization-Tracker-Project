/**
 * File: backend/src/validators/pushValidators.js
 * Purpose: Defines request-validation rules used to protect API endpoints from invalid input.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { body, param } from 'express-validator';
export const registerPushRules=[
 body('token').isString().matches(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/).withMessage('Enter a valid Expo push token'),
 body('device_id').trim().isLength({min:3,max:255}).withMessage('Device ID is required'),
 body('platform').optional().isIn(['ANDROID','IOS','WEB','UNKNOWN']),
 body('device_name').optional({nullable:true}).isLength({max:255})
];
export const deviceIdRules=[param('deviceId').trim().isLength({min:3,max:255})];
