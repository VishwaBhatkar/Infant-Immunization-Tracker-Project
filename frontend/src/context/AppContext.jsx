/**
 * File: frontend/src/context/AppContext.jsx
 * Purpose: Provides shared React application state and actions through Context.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { api, setUnauthorizedHandler } from '@/services/apiService';
import { authStorage } from '@/storage/authSessionStorage';
import { dark, light, highContrastDark, highContrastLight } from '@/constants/themeConstants';
import { registerForPushNotifications, startNotificationListeners, setNotificationPreferences } from '@/services/notificationService';
import { toast } from '@/utils/toastUtils';
import { authenticateBiometric, getBiometricSession, saveBiometricSession } from '@/services/biometricService';

const defaults = { accessibility_large_text:false, accessibility_high_contrast:false, biometric_enabled:false, promotional_notifications:false, email_notifications:false, sms_notifications:false, sound_enabled:true, vibration_enabled:true };
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [isDark,setDark]=useState(false);
  const [settings,setSettingsState]=useState(defaults);

  const applySettings=(value)=>{
    const next={...defaults,...value};
    setSettingsState(next);
    setNotificationPreferences(next);
    Text.defaultProps={...(Text.defaultProps||{}),allowFontScaling:true,maxFontSizeMultiplier:next.accessibility_large_text?1.35:1.0};
    TextInput.defaultProps={...(TextInput.defaultProps||{}),allowFontScaling:true,maxFontSizeMultiplier:next.accessibility_large_text?1.35:1.0};
  };

  const loadSettings=async()=>{ try { const r=await api.get('/settings'); applySettings(r.data.data); return r.data.data; } catch { applySettings(defaults); return defaults; } };

  useEffect(()=>{ setUnauthorizedHandler(()=>{setUser(null);setDark(false);applySettings(defaults);toast.error('Your session has expired. Please sign in again.','Session expired')}); return()=>setUnauthorizedHandler(null); },[]);
  useEffect(()=>{ (async()=>{ try { const saved=await authStorage.getDarkMode(); if(saved!==null)setDark(saved); const token=await authStorage.getToken(); if(!token)return; const r=await api.get('/auth/me'); const current=r.data.data; setUser(current); if(saved===null){const d=Boolean(current.dark_mode);setDark(d);await authStorage.setDarkMode(d)} await loadSettings(); } catch { await authStorage.removeToken();setUser(null); } finally { setLoading(false); } })(); },[]);
  useEffect(()=>{ if(!user)return; const stop=startNotificationListeners(user.role); registerForPushNotifications(settings).catch(()=>undefined); return stop; },[user?.id,settings.sound_enabled,settings.vibration_enabled]);

  const login=async(email,password)=>{ const r=await api.post('/auth/login',{email:email.trim(),password}); const {token,user:loggedInUser}=r.data.data; await authStorage.setToken(token); setUser(loggedInUser); const d=Boolean(loggedInUser.dark_mode);setDark(d);await authStorage.setDarkMode(d); const next=await loadSettings(); if(next.biometric_enabled)await saveBiometricSession(token); };
  const biometricLogin=async()=>{ const token=await getBiometricSession(); if(!token)throw new Error('Biometric login is not enabled. Sign in with your password first.'); const result=await authenticateBiometric(); if(!result.success)throw new Error(result.error==='user_cancel'?'Biometric sign-in cancelled.':'Biometric authentication failed.'); await authStorage.setToken(token); const r=await api.get('/auth/me');setUser(r.data.data);await loadSettings(); };
  const refreshProfile=async()=>{const r=await api.get('/profile');setUser(r.data.data);const d=Boolean(r.data.data.dark_mode);setDark(d);await authStorage.setDarkMode(d)};
  const logout=async()=>{await authStorage.removeToken();setUser(null);setDark(false);applySettings(defaults);await authStorage.setDarkMode(false)};
  const setTheme=async(d)=>{setDark(d);await authStorage.setDarkMode(d);try{const r=await api.patch('/profile',{dark_mode:d});setUser(r.data.data)}catch(e){console.warn('Unable to sync dark mode',e)}};
  const updateSettings=async(next)=>{const r=await api.patch('/settings',next);applySettings(r.data.data);const token=await authStorage.getToken();if(r.data.data.biometric_enabled&&token)await saveBiometricSession(token);return r.data.data};
  const theme=useMemo(()=>settings.accessibility_high_contrast?(isDark?highContrastDark:highContrastLight):(isDark?dark:light),[isDark,settings.accessibility_high_contrast]);
  return <AppContext.Provider value={{user,loading,theme,isDark,setTheme,toggleTheme:()=>setTheme(!isDark),login,biometricLogin,logout,refreshProfile,settings,updateSettings}}>{children}</AppContext.Provider>;
}
export const useApp=()=>{const c=useContext(AppContext);if(!c)throw new Error('useApp must be used inside AppProvider');return c};
