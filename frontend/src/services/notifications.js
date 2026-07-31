import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { api } from './api';
const DEVICE_KEY = 'notification_device_id';
let receivedSubscription = null;
let responseSubscription = null;
let handlerConfigured = false;
/** Remote Android push is unavailable in Expo Go from SDK 53 onward. */
function supportsNativeNotifications() {
    return Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}
async function notificationsModule() {
    if (!supportsNativeNotifications())
        return null;
    // Lazy loading is important: importing expo-notifications at module startup
    // causes Expo Go to display an SDK 53+ runtime error before the app renders.
    const Notifications = await import('expo-notifications');
    if (!handlerConfigured) {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: true
            })
        });
        handlerConfigured = true;
    }
    return Notifications;
}
async function deviceId() {
    let id = await SecureStore.getItemAsync(DEVICE_KEY);
    if (!id) {
        id = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await SecureStore.setItemAsync(DEVICE_KEY, id);
    }
    return id;
}
function appointmentRoute(role) {
    switch (role) {
        case 'DOCTOR': return '/(doctor)/appointments';
        case 'HOSPITAL_ADMIN': return '/(hospital-admin)/appointments';
        case 'SYSTEM_ADMIN': return '/(system-admin)/appointments';
        default: return '/(parent)/appointments';
    }
}
function openNotification(data, role) {
    const type = String(data.type || '').toUpperCase();
    if (type.includes('APPOINTMENT')) {
        router.push(appointmentRoute(role));
        return;
    }
    if (type.includes('VACCINE') && role === 'PARENT') {
        router.push('/(parent)/schedule');
    }
}
export async function registerForPushNotifications() {
    const Notifications = await notificationsModule();
    if (!Notifications) {
        return {
            registered: false,
            reason: Platform.OS === 'web'
                ? 'Native push notifications are not registered on web.'
                : 'Remote push notifications require a development build; Expo Go was detected.'
        };
    }
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Vaccination reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default'
        });
    }
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
        status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') {
        return { registered: false, reason: 'Notification permission was denied.' };
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
        return { registered: false, reason: 'Expo project ID is not configured.' };
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const id = await deviceId();
    await api.post('/notifications/push-token', {
        token,
        device_id: id,
        platform: Platform.OS.toUpperCase(),
        device_name: `${Platform.OS} device`
    });
    return { registered: true, token };
}
export function startNotificationListeners(role) {
    let disposed = false;
    void notificationsModule().then(async (Notifications) => {
        if (!Notifications || disposed)
            return;
        receivedSubscription?.remove();
        responseSubscription?.remove();
        receivedSubscription = Notifications.addNotificationReceivedListener(() => undefined);
        responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
            openNotification(response.notification.request.content.data, role);
        });
        const response = await Notifications.getLastNotificationResponseAsync().catch(() => null);
        if (response && !disposed) {
            openNotification(response.notification.request.content.data, role);
        }
    }).catch((error) => {
        console.warn('Notification listeners were not started:', error);
    });
    return () => {
        disposed = true;
        receivedSubscription?.remove();
        responseSubscription?.remove();
        receivedSubscription = null;
        responseSubscription = null;
    };
}
