import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
const TOKEN_KEY = 'auth_token';
const THEME_KEY = 'app_dark_mode';
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
    async removeToken() {
        if (Platform.OS === 'web') {
            await AsyncStorage.removeItem(TOKEN_KEY);
            return;
        }
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
};
