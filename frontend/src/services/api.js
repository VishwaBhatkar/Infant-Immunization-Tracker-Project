import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { authStorage } from '@/storage/authStorage';
export class ApiError extends Error {
    status;
    errors;
    constructor(message, status, errors) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }
}
const removeTrailingSlash = (value) => value.replace(/\/+$/, '');
const platformUrls = {
    web: process.env.EXPO_PUBLIC_API_URL_WEB,
    android: process.env.EXPO_PUBLIC_API_URL_ANDROID,
    ios: process.env.EXPO_PUBLIC_API_URL_IOS
};
/**
 * Expo normally exposes the development computer address through hostUri.
 * This lets a physical phone call the backend without hard-coding the LAN IP.
 */
const getExpoDevelopmentHost = () => {
    const hostUri = Constants.expoConfig?.hostUri ||
        Constants.manifest2?.extra?.expoClient?.hostUri ||
        Constants.manifest?.debuggerHost;
    if (!hostUri)
        return undefined;
    // Handles values such as 192.168.1.10:8081 and exp://192.168.1.10:8081.
    const withoutProtocol = hostUri.replace(/^\w+:\/\//, '');
    return withoutProtocol.split(':')[0];
};
const getAutomaticApiUrl = () => {
    const port = process.env.EXPO_PUBLIC_API_PORT ||
        String(Constants.expoConfig?.extra?.apiPort || 5000);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return `http://${window.location.hostname}:${port}/api`;
    }
    let host = getExpoDevelopmentHost();
    // Android emulators cannot use the computer's localhost directly.
    if (Platform.OS === 'android' && (!host || host === 'localhost' || host === '127.0.0.1')) {
        host = '10.0.2.2';
    }
    if (Platform.OS === 'ios' && !host) {
        host = 'localhost';
    }
    return host ? `http://${host}:${port}/api` : undefined;
};
const configuredUrl = platformUrls[Platform.OS] ||
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL;
const automaticUrl = getAutomaticApiUrl();
const safeFallbackUrl = Platform.OS === 'android'
    ? `http://10.0.2.2:${process.env.EXPO_PUBLIC_API_PORT || 5000}/api`
    : `http://localhost:${process.env.EXPO_PUBLIC_API_PORT || 5000}/api`;
// Never crash the application during module initialization because the backend
// address is missing. Requests will return a readable ApiError instead.
export const API_BASE_URL = removeTrailingSlash(configuredUrl || automaticUrl || safeFallbackUrl);
if (__DEV__) {
    console.log(`[API] ${Platform.OS}: ${API_BASE_URL}`);
}
let unauthorizedHandler = null;
export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = handler;
};
export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: Number(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT || 15000),
    headers: { 'Content-Type': 'application/json' }
});
api.interceptors.request.use(async (config) => {
    const token = await authStorage.getToken();
    if (token)
        config.headers.Authorization = `Bearer ${token}`;
    return config;
});
api.interceptors.response.use((response) => response, async (error) => {
    const status = error.response?.status;
    const responseData = error.response?.data;
    if (status === 401) {
        await authStorage.removeToken();
        await unauthorizedHandler?.();
    }
    if (!error.response) {
        return Promise.reject(new ApiError(`Cannot reach ${API_BASE_URL}. Start the backend and keep the computer and phone on the same Wi-Fi network.`));
    }
    return Promise.reject(new ApiError(responseData?.message || 'Request failed', status, responseData?.errors));
});
