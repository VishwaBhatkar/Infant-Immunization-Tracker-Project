/**
 * File: backend/src/constants/roles.js
 * Purpose: Stores shared constant values used across the application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
// Define all supported user roles
export const ROLES = Object.freeze({
  PARENT: 'PARENT',
  DOCTOR: 'DOCTOR',
  HOSPITAL_ADMIN: 'HOSPITAL_ADMIN',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN'
});

// List of all available roles
export const ALL_ROLES = Object.freeze(
  Object.values(ROLES)
);

// Roles with administrative privileges
export const ADMIN_ROLES = Object.freeze([
  ROLES.HOSPITAL_ADMIN,
  ROLES.SYSTEM_ADMIN
]);