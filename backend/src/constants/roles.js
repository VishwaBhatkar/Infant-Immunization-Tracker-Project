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