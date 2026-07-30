import { body, param } from 'express-validator';
export const registerPushRules=[
 body('token').isString().matches(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/).withMessage('Enter a valid Expo push token'),
 body('device_id').trim().isLength({min:3,max:255}).withMessage('Device ID is required'),
 body('platform').optional().isIn(['ANDROID','IOS','WEB','UNKNOWN']),
 body('device_name').optional({nullable:true}).isLength({max:255})
];
export const deviceIdRules=[param('deviceId').trim().isLength({min:3,max:255})];
