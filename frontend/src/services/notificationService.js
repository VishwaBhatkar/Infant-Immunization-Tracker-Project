/**
 * File: frontend/src/services/notificationService.js
 * Purpose: Contains reusable business-support operations and integrations used by controllers and background jobs.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { api } from './apiService';

// ======================================================
// Secure storage key for storing unique device ID
// ======================================================
const DEVICE_KEY = 'notification_device_id';

// Notification listener references
let receivedSubscription = null;
let responseSubscription = null;

// Prevents notification handler from being configured multiple times
let handlerConfigured = false;
let currentPreferences = { sound_enabled: true, vibration_enabled: true };
export function setNotificationPreferences(preferences = {}) { currentPreferences = { ...currentPreferences, ...preferences }; handlerConfigured = false; }

/**
 * ======================================================
 * Check whether native push notifications are supported.
 *
 * Expo Go (SDK 53+) does not support remote push
 * notifications, so they only work in Development Build
 * or Production Build.
 * ======================================================
 */
function supportsNativeNotifications() {

    return (
        Platform.OS !== 'web' &&
        Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
    );
}

/**
 * ======================================================
 * Dynamically import expo-notifications
 *
 * Lazy loading avoids runtime errors in Expo Go.
 * Also configures notification behavior only once.
 * ======================================================
 */
async function notificationsModule() {

    if (!supportsNativeNotifications())
        return null;

    const Notifications = await import('expo-notifications');

    if (!handlerConfigured) {

        Notifications.setNotificationHandler({

            handleNotification: async () => ({

                // Display notification banner
                shouldShowBanner: true,

                // Display in notification list
                shouldShowList: true,

                // Play notification sound
                shouldPlaySound: Boolean(currentPreferences.sound_enabled),

                // Update app badge
                shouldSetBadge: true
            })
        });

        handlerConfigured = true;
    }

    return Notifications;
}

/**
 * ======================================================
 * Generate or retrieve unique device ID
 *
 * Stored securely using Expo SecureStore.
 * ======================================================
 */
async function deviceId() {

    let id = await SecureStore.getItemAsync(DEVICE_KEY);

    if (!id) {

        // Create unique ID
        id =
            `${Platform.OS}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`;

        await SecureStore.setItemAsync(DEVICE_KEY, id);
    }

    return id;
}

/**
 * ======================================================
 * Returns appointment screen based on user role.
 * ======================================================
 */
function appointmentRoute(role) {

    switch (role) {

        case 'DOCTOR':
            return '/(doctor)/appointments';

        case 'HOSPITAL_ADMIN':
            return '/(hospital-admin)/appointments';

        case 'SYSTEM_ADMIN':
            return '/(system-admin)/appointments';

        default:
            return '/(parent)/appointments';
    }
}

/**
 * ======================================================
 * Opens the appropriate screen when a notification
 * is clicked.
 * ======================================================
 */
function openNotification(data, role) {

    const type = String(data.type || '').toUpperCase();

    // Appointment notification
    if (type.includes('APPOINTMENT')) {

        router.push(
            appointmentRoute(role)
        );

        return;
    }

    // Vaccine reminder notification
    if (
        type.includes('VACCINE') &&
        role === 'PARENT'
    ) {

        router.push('/(parent)/schedule');
    }
}

/**
 * ======================================================
 * Register Device for Push Notifications
 *
 * Steps:
 * 1. Check notification support
 * 2. Create Android notification channel
 * 3. Ask permission
 * 4. Generate Expo Push Token
 * 5. Store token in backend
 * ======================================================
 */
export async function registerForPushNotifications(preferences = {}) {
    setNotificationPreferences(preferences);

    const Notifications =
        await notificationsModule();

    if (!Notifications) {

        return {

            registered: false,

            reason:
                Platform.OS === 'web'
                    ? 'Native push notifications are not registered on web.'
                    : 'Remote push notifications require a development build; Expo Go was detected.'
        };
    }

    // Android notification channel
    if (Platform.OS === 'android') {

        await Notifications.setNotificationChannelAsync(

            'default',

            {

                name: 'Vaccination reminders',

                importance:
                    Notifications.AndroidImportance.HIGH,

                vibrationPattern: currentPreferences.vibration_enabled ? [0, 250, 250, 250] : [0],

                sound: currentPreferences.sound_enabled ? 'default' : null
            }
        );
    }

    // Check existing permission
    const current =
        await Notifications.getPermissionsAsync();

    let status = current.status;

    // Request permission if needed
    if (status !== 'granted') {

        status =
            (
                await Notifications.requestPermissionsAsync()
            ).status;
    }

    // Permission denied
    if (status !== 'granted') {

        return {

            registered: false,

            reason:
                'Notification permission was denied.'
        };
    }

    // Get Expo Project ID
    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

    if (!projectId) {

        return {

            registered: false,

            reason:
                'Expo project ID is not configured.'
        };
    }

    // Generate Expo Push Token
    const token =
        (
            await Notifications.getExpoPushTokenAsync({

                projectId
            })
        ).data;

    // Get unique device ID
    const id = await deviceId();

    // Save push token to backend
    await api.post('/notifications/push-token', {

        token,

        device_id: id,

        platform:
            Platform.OS.toUpperCase(),

        device_name:
            `${Platform.OS} device`
    });

    return {

        registered: true,

        token
    };
}

/**
 * ======================================================
 * Start Notification Listeners
 *
 * Listens for:
 * 1. Notification received
 * 2. Notification clicked
 * 3. App opened from notification
 * ======================================================
 */
export function startNotificationListeners(role) {

    let disposed = false;

    void notificationsModule()

        .then(async (Notifications) => {

            if (!Notifications || disposed)
                return;

            // Remove old listeners
            receivedSubscription?.remove();

            responseSubscription?.remove();

            // Notification received while app is open
            receivedSubscription =
                Notifications.addNotificationReceivedListener(
                    () => undefined
                );

            // Notification clicked
            responseSubscription =
                Notifications.addNotificationResponseReceivedListener(

                    (response) => {

                        openNotification(

                            response.notification.request.content.data,

                            role
                        );
                    }
                );

            // Handle notification that opened app
            const response =
                await Notifications
                    .getLastNotificationResponseAsync()
                    .catch(() => null);

            if (response && !disposed) {

                openNotification(

                    response.notification.request.content.data,

                    role
                );
            }
        })

        .catch((error) => {

            console.warn(

                'Notification listeners were not started:',

                error
            );
        });

    // Cleanup listeners
    return () => {

        disposed = true;

        receivedSubscription?.remove();

        responseSubscription?.remove();

        receivedSubscription = null;

        responseSubscription = null;
    };
}