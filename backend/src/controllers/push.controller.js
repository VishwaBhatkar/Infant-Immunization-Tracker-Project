// Import success response helper
import { ok } from '../utils/response.js';

// Import Expo Push Notification service functions
import {
    registerDeviceToken,
    deactivateDeviceToken,
    deliverPendingPushes,
    checkExpoReceipts,
} from '../services/expoPush.service.js';

/**
 * Register a user's device for push notifications.
 */
export async function register(req, res, next) {
    try {
        await registerDeviceToken(req.user.id, req.body);

        ok(res, null, 'Notification device registered');
    } catch (e) {
        next(e);
    }
}

/**
 * Remove (deactivate) a registered device from receiving notifications.
 */
export async function remove(req, res, next) {
    try {
        await deactivateDeviceToken(req.user.id, req.params.deviceId);

        ok(res, null, 'Notification device removed');
    } catch (e) {
        next(e);
    }
}

/**
 * Send all pending push notifications.
 */
export async function sendPending(req, res, next) {
    try {
        ok(
            res,
            await deliverPendingPushes(),
            'Pending push notifications processed'
        );
    } catch (e) {
        next(e);
    }
}

/**
 * Process Expo push notification delivery receipts.
 */
export async function receipts(req, res, next) {
    try {
        ok(
            res,
            await checkExpoReceipts(),
            'Expo receipts processed'
        );
    } catch (e) {
        next(e);
    }
}