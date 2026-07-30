import 'dotenv/config';
import { pool } from '../src/config/db.js';

// Normalize environment variable values
const clean = (value) => String(value ?? '').trim();

const name = clean(process.env.ADMIN_NAME);
const email = clean(process.env.ADMIN_EMAIL).toLowerCase();
const phone = clean(process.env.ADMIN_PHONE);
const password = String(process.env.ADMIN_PASSWORD ?? '');
const role = clean(
  process.env.ADMIN_ROLE || 'SYSTEM_ADMIN'
).toUpperCase();
const hospitalId = Number(
  process.env.ADMIN_HOSPITAL_ID || 0
);

// Report admin creation failure without terminating cleanup
const fail = (message) => {
  console.error(`Admin creation failed: ${message}`);
  process.exitCode = 1;
};

// Validate admin account configuration
const validate = () => {
  if (name.length < 2 || name.length > 100) {
    return 'ADMIN_NAME must contain 2-100 characters.';
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return 'ADMIN_EMAIL must be a valid email address.';
  }

  if (!/^[0-9+() -]{7,20}$/.test(phone)) {
    return 'ADMIN_PHONE must contain a valid phone number.';
  }

  if (password.length < 10) {
    return 'ADMIN_PASSWORD must contain at least 10 characters.';
  }

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialCharacter = /[^A-Za-z0-9]/.test(password);

  if (
    !hasLowercase ||
    !hasUppercase ||
    !hasNumber ||
    !hasSpecialCharacter
  ) {
    return (
      'ADMIN_PASSWORD must include uppercase, lowercase, ' +
      'number, and special character.'
    );
  }

  if (
    !['SYSTEM_ADMIN', 'HOSPITAL_ADMIN'].includes(role)
  ) {
    return (
      'ADMIN_ROLE must be SYSTEM_ADMIN or HOSPITAL_ADMIN.'
    );
  }

  if (
    role === 'HOSPITAL_ADMIN' &&
    (!Number.isInteger(hospitalId) || hospitalId <= 0)
  ) {
    return (
      'ADMIN_HOSPITAL_ID is required for a HOSPITAL_ADMIN.'
    );
  }

  return null;
};

// Load bcrypt with a clear dependency error
const loadBcrypt = async () => {
  try {
    const module = await import('bcryptjs');

    return module.default ?? module;
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(
        'bcryptjs is not installed. Run "npm install" ' +
          '(or "npm install bcryptjs") inside the backend ' +
          'folder, then run this command again.'
      );
    }

    throw error;
  }
};

// Create the administrator account within a transaction
const run = async () => {
  const validationError = validate();

  if (validationError) {
    throw new Error(validationError);
  }

  const bcrypt = await loadBcrypt();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Prevent duplicate email or phone accounts
    const [duplicates] = await connection.query(
      `SELECT
         id,
         email,
         phone,
         role,
         is_active,
         deleted_at
       FROM users
       WHERE email = ? OR phone = ?
       LIMIT 1`,
      [email, phone]
    );

    if (duplicates.length > 0) {
      throw new Error(
        `A user with this email or phone already exists ` +
          `(user ID ${duplicates[0].id}, ` +
          `role ${duplicates[0].role}). ` +
          'Use the System Admin user-management API to ' +
          'change an existing account.'
      );
    }

    // Verify the assigned hospital for hospital administrators
    if (role === 'HOSPITAL_ADMIN') {
      const [hospitals] = await connection.query(
        `SELECT id
         FROM hospitals
         WHERE id = ?
           AND is_active = TRUE
           AND deleted_at IS NULL
         LIMIT 1`,
        [hospitalId]
      );

      if (hospitals.length === 0) {
        throw new Error(
          'The selected hospital is missing, inactive, or deleted.'
        );
      }
    }

    // Hash the password before storing the account
    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await connection.query(
      `INSERT INTO users (
         name,
         email,
         phone,
         password_hash,
         role,
         is_active,
         deleted_at,
         deleted_by
       )
       VALUES (?, ?, ?, ?, ?, TRUE, NULL, NULL)`,
      [name, email, phone, passwordHash, role]
    );

    // Link a hospital administrator to the selected hospital
    if (role === 'HOSPITAL_ADMIN') {
      await connection.query(
        `INSERT INTO hospital_admins (
           user_id,
           hospital_id
         )
         VALUES (?, ?)`,
        [result.insertId, hospitalId]
      );
    }

    await connection.commit();

    console.log(`Created ${role} account successfully.`);
    console.log(`User ID: ${result.insertId}`);
    console.log(`Email: ${email}`);
    console.log(
      'Use the normal Login screen. Admin roles must not ' +
        'be exposed in public registration.'
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

try {
  await run();
} catch (error) {
  fail(error.message);
} finally {
  await pool.end().catch(() => undefined);
}