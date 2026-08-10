/**
 * File: frontend/src/services/apiService.js
 * Purpose: Contains reusable business-support operations and integrations used by controllers and background jobs.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { authStorage } from '@/storage/authSessionStorage';
import { requestFinished, requestStarted } from '@/services/requestActivityService';

// ======================================================
// Custom API Error Class
// Used to provide detailed error information
// ======================================================
export class ApiError extends Error {

    // HTTP status code (404, 500, etc.)
    status;

    // Validation or server errors
    errors;

    constructor(message, status, errors) {

        super(message);

        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }
}

// ======================================================
// Removes extra "/" from the end of URL
// Example:
// http://localhost:5000/api/ -> http://localhost:5000/api
// ======================================================
const removeTrailingSlash = (value) =>
    value.replace(/\/+$/, '');

// ======================================================
// Platform-specific backend URLs
// Reads values from .env file
// ======================================================
const platformUrls = {

    web: process.env.EXPO_PUBLIC_API_URL_WEB,

    android: process.env.EXPO_PUBLIC_API_URL_ANDROID,

    ios: process.env.EXPO_PUBLIC_API_URL_IOS
};

/**
 * ======================================================
 * Get Expo Development Host IP
 *
 * Expo provides the computer IP address while running
 * on a physical device.
 *
 * Example:
 * exp://192.168.1.20:8081
 * Returns:
 * 192.168.1.20
 * ======================================================
 */
const getExpoDevelopmentHost = () => {

    const hostUri =
        Constants.expoConfig?.hostUri ||
        Constants.manifest2?.extra?.expoClient?.hostUri ||
        Constants.manifest?.debuggerHost;

    if (!hostUri)
        return undefined;

    // Remove protocol (exp:// or http://)
    const withoutProtocol =
        hostUri.replace(/^\w+:\/\//, '');

    // Return only IP address
    return withoutProtocol.split(':')[0];
};

// ======================================================
// Automatically generate backend URL
// depending on the platform
// ======================================================
const getAutomaticApiUrl = () => {

    // Backend server port
    const port =
        process.env.EXPO_PUBLIC_API_PORT ||
        String(Constants.expoConfig?.extra?.apiPort || 5000);

    // Web platform
    if (Platform.OS === 'web' &&
        typeof window !== 'undefined') {

        const isLocalWebHost =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';

        return isLocalWebHost
            ? `http://${window.location.hostname}:${port}/api`
            : 'https://infant-immunization-tracker-project-1.onrender.com/api';
    }

    // Detect development machine IP
    let host = getExpoDevelopmentHost();

    // Android emulator uses 10.0.2.2 instead of localhost
    if (
        Platform.OS === 'android' &&
        (!host ||
            host === 'localhost' ||
            host === '127.0.0.1')
    ) {

        host = '10.0.2.2';
    }

    // iOS simulator can use localhost
    if (
        Platform.OS === 'ios' &&
        !host
    ) {

        host = 'localhost';
    }

    return host
        ? `http://${host}:${port}/api`
        : undefined;
};

// ======================================================
// Select backend URL
// Priority:
//
// 1. Platform URL
// 2. EXPO_PUBLIC_API_URL
// 3. EXPO_PUBLIC_API_BASE_URL
// ======================================================
const configuredUrl =
    platformUrls[Platform.OS] ||
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL;

// Automatic URL generation
const automaticUrl = getAutomaticApiUrl();

// ======================================================
// Safe fallback URL
// Used when no URL is configured
// ======================================================
const safeFallbackUrl =
    Platform.OS === 'android'
        ? `http://10.0.2.2:${process.env.EXPO_PUBLIC_API_PORT || 5000}/api`
        : `http://localhost:${process.env.EXPO_PUBLIC_API_PORT || 5000}/api`;

// ======================================================
// Final Backend URL
// Never allow application crash because of missing URL
// ======================================================
export const API_BASE_URL =
    removeTrailingSlash(
        configuredUrl ||
        automaticUrl ||
        safeFallbackUrl
    );

// Show backend URL in development mode
if (__DEV__) {

    console.log(
        `[API] ${Platform.OS}: ${API_BASE_URL}`
    );
}

// ======================================================
// Unauthorized Handler
// Used when JWT expires (401 Unauthorized)
// ======================================================
let unauthorizedHandler = null;

// Register logout callback
export const setUnauthorizedHandler = (handler) => {

    unauthorizedHandler = handler;
};

// ======================================================
// Create Axios API Instance
// ======================================================
export const api = axios.create({

    // Backend URL
    baseURL: API_BASE_URL,

    // Request timeout
    timeout: Number(
        process.env.EXPO_PUBLIC_REQUEST_TIMEOUT || 15000
    ),

    // Default request header
    headers: {

        'Content-Type': 'application/json'
    }
});

// ======================================================
// Request Interceptor
// Automatically attaches JWT Token
// before every request
// ======================================================
api.interceptors.request.use(async (config) => {

    requestStarted();

    // Read token from local storage
    const token = await authStorage.getToken();

    // Add Authorization header
    if (token)
        config.headers.Authorization = `Bearer ${token}`;

    return config;
});

// ======================================================
// Response Interceptor
// Handles API errors globally
// ======================================================
api.interceptors.response.use(

    // Success response
    (response) => { requestFinished(); return response; },

    // Error response
    async (error) => {

        requestFinished();
        const status = error.response?.status;

        const responseData =
            error.response?.data;

        // Token expired
        if (status === 401) {

            // Remove saved token
            await authStorage.removeToken();

            // Logout user
            await unauthorizedHandler?.();
        }

        if (error.code === 'ECONNABORTED') {
            return Promise.reject(new ApiError('The request timed out. Please try again.', 408));
        }

        // Backend unreachable
        if (!error.response) {

            return Promise.reject(

                new ApiError(

                    'No internet connection or the server is unavailable. Check your network and try again.'
                )
            );
        }

        // Convert server error into ApiError
        return Promise.reject(

            new ApiError(

                responseData?.message ||
                'Request failed',

                status,

                responseData?.errors
            )
        );
    }
);
