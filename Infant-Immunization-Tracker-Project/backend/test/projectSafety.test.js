import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AppError } from '../src/utils/AppError.js';
import { ROLES, ADMIN_ROLES } from '../src/constants/roles.js';

test('AppError keeps operational error metadata', () => {
  const error = new AppError('Bad request', 400, [{ field: 'name' }]);
  assert.equal(error.name, 'AppError');
  assert.equal(error.message, 'Bad request');
  assert.equal(error.statusCode, 400);
  assert.deepEqual(error.details, [{ field: 'name' }]);
  assert.equal(error.isOperational, true);
});

test('all expected application roles are defined', () => {
  assert.deepEqual(new Set(Object.values(ROLES)), new Set(['PARENT', 'DOCTOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN']));
});

test('admin role group contains only administrative roles', () => {
  assert.deepEqual(new Set(ADMIN_ROLES), new Set([ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN]));
});

test('admin API namespace is globally authenticated before admin routes', () => {
  const source = fs.readFileSync(new URL('../src/routes/index.js', import.meta.url), 'utf8');
  const guard = source.indexOf("r.use('/admin', authenticate");
  const firstAdminRoute = source.indexOf("r.get('/admin/");
  assert.ok(guard >= 0, 'Admin authentication guard is missing');
  assert.ok(firstAdminRoute > guard, 'Admin routes must be declared after the authentication guard');
});

test('sensitive admin reminder and push endpoints remain under /admin namespace', () => {
  const source = fs.readFileSync(new URL('../src/routes/index.js', import.meta.url), 'utf8');
  assert.match(source, /\/admin\/reminders\/run/);
  assert.match(source, /\/admin\/push\/send-pending/);
  assert.match(source, /\/admin\/push\/check-receipts/);
});

test('registration route keeps authentication rate limiting enabled', () => {
  const source = fs.readFileSync(new URL('../src/routes/index.js', import.meta.url), 'utf8');
  assert.match(source, /r\.post\('\/auth\/register', authLimiter/);
});

test('login route keeps authentication rate limiting enabled', () => {
  const source = fs.readFileSync(new URL('../src/routes/index.js', import.meta.url), 'utf8');
  assert.match(source, /r\.post\('\/auth\/login', authLimiter/);
});
