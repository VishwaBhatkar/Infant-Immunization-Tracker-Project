import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler } from '@/services/api';
import { authStorage } from '@/storage/authStorage';
import { dark, light } from '@/constants/theme';
import { registerForPushNotifications, startNotificationListeners } from '@/services/notifications';
const AppContext = createContext(null);
export function AppProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDark, setDark] = useState(false);
    useEffect(() => {
        setUnauthorizedHandler(() => {
            setUser(null);
            setDark(false);
        });
        return () => setUnauthorizedHandler(null);
    }, []);
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const savedTheme = await authStorage.getDarkMode();
                if (savedTheme !== null)
                    setDark(savedTheme);
                const token = await authStorage.getToken();
                if (!token)
                    return;
                const response = await api.get('/auth/me');
                const currentUser = response.data.data;
                setUser(currentUser);
                if (savedTheme === null) {
                    const serverTheme = Boolean(currentUser.dark_mode);
                    setDark(serverTheme);
                    await authStorage.setDarkMode(serverTheme);
                }
            }
            catch {
                await authStorage.removeToken();
                setUser(null);
            }
            finally {
                setLoading(false);
            }
        };
        void restoreSession();
    }, []);
    useEffect(() => {
        if (!user)
            return;
        const stop = startNotificationListeners(user.role);
        void registerForPushNotifications().catch(() => undefined);
        return stop;
    }, [user?.id]);
    const login = async (email, password) => {
        const response = await api.post('/auth/login', {
            email: email.trim(),
            password
        });
        const { token, user: loggedInUser } = response.data.data;
        await authStorage.setToken(token);
        setUser(loggedInUser);
        const serverTheme = Boolean(loggedInUser.dark_mode);
        setDark(serverTheme);
        await authStorage.setDarkMode(serverTheme);
    };
    const refreshProfile = async () => {
        const response = await api.get('/profile');
        const currentUser = response.data.data;
        setUser(currentUser);
        const serverTheme = Boolean(currentUser.dark_mode);
        setDark(serverTheme);
        await authStorage.setDarkMode(serverTheme);
    };
    const logout = async () => {
        await authStorage.removeToken();
        setUser(null);
        setDark(false);
        await authStorage.setDarkMode(false);
    };
    const setTheme = async (darkMode) => {
        // Apply immediately so the switch feels responsive on web and mobile.
        setDark(darkMode);
        await authStorage.setDarkMode(darkMode);
        try {
            const response = await api.patch('/profile', { dark_mode: darkMode });
            setUser(response.data.data);
        }
        catch (error) {
            // Keep the locally saved preference even if the profile API is temporarily unavailable.
            console.warn('Unable to sync dark-mode preference with the server', error);
        }
    };
    const toggleTheme = async () => setTheme(!isDark);
    return (<AppContext.Provider value={{
            user,
            loading,
            theme: isDark ? dark : light,
            isDark,
            setTheme,
            login,
            logout,
            toggleTheme,
            refreshProfile
        }}>
      {children}
    </AppContext.Provider>);
}
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used inside AppProvider');
    }
    return context;
};
