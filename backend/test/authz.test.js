/**
 * File: backend/test/authz.test.js
 * Purpose: Contains automated tests that verify expected application behavior and authorization rules.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeRoles } from '../src/middleware/authMiddleware.js';
import { ROLES } from '../src/constants/roles.js';

test('authorizeRoles allows an accepted role', () => {
  const middleware = authorizeRoles(ROLES.SYSTEM_ADMIN);
  let nextError;
  middleware({ user: { id: 1, role: ROLES.SYSTEM_ADMIN } }, {}, (error) => {
    nextError = error;
  });
  assert.equal(nextError, undefined);
});

test('authorizeRoles rejects an unaccepted role', () => {
  const middleware = authorizeRoles(ROLES.SYSTEM_ADMIN);
  let nextError;
  middleware({ user: { id: 2, role: ROLES.PARENT } }, {}, (error) => {
    nextError = error;
  });
  assert.equal(nextError.statusCode, 403);
});

test('authorizeRoles rejects a missing authenticated user', () => {
  const middleware = authorizeRoles(ROLES.SYSTEM_ADMIN);
  let nextError;
  middleware({}, {}, (error) => {
    nextError = error;
  });
  assert.equal(nextError.statusCode, 403);
});
