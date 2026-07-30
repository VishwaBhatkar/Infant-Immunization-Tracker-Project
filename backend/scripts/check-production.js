const failures = [];
const warnings = [];

// Validate required production environment variables
if ((process.env.JWT_SECRET || '').length < 32) {
  failures.push(
    'JWT_SECRET must contain at least 32 characters.'
  );
}

if (!process.env.CORS_ORIGINS) {
  failures.push(
    'CORS_ORIGINS must be explicitly configured.'
  );
}

if ((process.env.CORS_ORIGINS || '').includes('*')) {
  failures.push(
    'CORS_ORIGINS must not contain a wildcard.'
  );
}

// Collect non-critical production configuration warnings
if (process.env.NODE_ENV !== 'production') {
  warnings.push(
    'NODE_ENV is not production.'
  );
}

if (!process.env.DB_PASSWORD) {
  warnings.push(
    'DB_PASSWORD is empty.'
  );
}

// Display configuration warnings and failures
for (const warning of warnings) {
  console.warn(`WARNING: ${warning}`);
}

for (const failure of failures) {
  console.error(`ERROR: ${failure}`);
}

// Stop application startup when critical checks fail
if (failures.length > 0) {
  process.exit(1);
}

console.log('Production environment checks passed.');