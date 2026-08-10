/**
 * File: frontend/src/services/requestActivityService.js
 * Purpose: Contains reusable business-support operations and integrations used by controllers and background jobs.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
let activeRequests = 0;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener(activeRequests > 0));
export const requestStarted = () => { activeRequests += 1; emit(); };
export const requestFinished = () => { activeRequests = Math.max(0, activeRequests - 1); emit(); };
export const subscribeToRequestActivity = (listener) => { listeners.add(listener); listener(activeRequests > 0); return () => listeners.delete(listener); };
