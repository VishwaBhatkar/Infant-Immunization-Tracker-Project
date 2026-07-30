import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeRoles } from '../src/middleware/auth.js';
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
