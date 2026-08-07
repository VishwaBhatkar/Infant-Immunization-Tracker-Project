/**
 * File: frontend/src/storage/authSessionStorage.js
 * Purpose: Provides a storage abstraction for persisting and restoring application data.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
const TOKEN_KEY = 'auth_token';
const THEME_KEY = 'app_dark_mode';
const BIOMETRIC_TOKEN_KEY = 'biometric_auth_token';
export const authStorage = {
    async getToken() {
        if (Platform.OS === 'web') {
            return AsyncStorage.getItem(TOKEN_KEY);
        }
        return SecureStore.getItemAsync(TOKEN_KEY);
    },
    async setToken(token) {
        if (Platform.OS === 'web') {
            await AsyncStorage.setItem(TOKEN_KEY, token);
            return;
        }
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    },
    async getDarkMode() {
        const value = await AsyncStorage.getItem(THEME_KEY);
        return value === null ? null : value === 'true';
    },
    async setDarkMode(enabled) {
        await AsyncStorage.setItem(THEME_KEY, String(enabled));
    },
    async getBiometricToken() {
        if (Platform.OS === 'web') return null;
        return SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
    },
    async setBiometricToken(token) {
        if (Platform.OS !== 'web') await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
    },
    async removeBiometricToken() {
        if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
    },
    async removeToken() {
        if (Platform.OS === 'web') {
            await AsyncStorage.removeItem(TOKEN_KEY);
            return;
        }
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
};
