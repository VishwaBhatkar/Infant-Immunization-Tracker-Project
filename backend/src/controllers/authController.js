/**
 * File: backend/src/controllers/authController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { ok } from '../utils/responseUtils.js';

// Generate JWT token after successful authentication
const createToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );

// Public user fields returned to the client
const publicUserFields = `
  id,
  name,
  email,
  phone,
  role,
  avatar_url,
  dark_mode,
  is_active,
  created_at,
  updated_at
`;

// Register a new user
export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const role = String(req.body.role || '').toUpperCase();

    // Check whether email or phone already exists
    const [duplicates] = await pool.query(
      'SELECT email, phone FROM users WHERE email = ? OR phone = ? LIMIT 1',
      [email, phone]
    );

    if (duplicates.length) {
      if (duplicates[0].email === email) {
        throw new AppError('Email already registered', 409, [
          {
            field: 'email',
            message: 'Email already registered'
          }
        ]);
      }

      throw new AppError('Mobile number already registered', 409, [
        {
          field: 'phone',
          message: 'Mobile number already registered'
        }
      ]);
    }

    // Hash password before storing it
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert new user into database
    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, phone, passwordHash, role]
    );

    const user = {
      id: result.insertId,
      name,
      email,
      phone,
      role
    };

    ok(res, { user }, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
};

// Authenticate user and return JWT token
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch user by email
    const [rows] = await pool.query(
      `SELECT ${publicUserFields}, password_hash
       FROM users
       WHERE email = ? AND deleted_at IS NULL
       LIMIT 1`,
      [email]
    );

    const user = rows[0];

    // Verify password
    const passwordMatches = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!user || !passwordMatches) {
      throw new AppError('Invalid email or password', 401);
    }

    // Prevent inactive users from logging in
    if (!user.is_active) {
      throw new AppError(
        'Your account is inactive. Contact support.',
        403
      );
    }

    // Remove password hash before sending response
    delete user.password_hash;

    // Generate authentication token
    const token = createToken(user);

    ok(res, { user, token }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// Return logged-in user's profile
export const me = async (req, res, next) => {
  try {
    // Fetch current user's profile
    const [rows] = await pool.query(
      `SELECT ${publicUserFields}
       FROM users
       WHERE id = ? AND is_active = 1 AND deleted_at IS NULL
       LIMIT 1`,
      [req.user.id]
    );

    if (!rows.length) {
      throw new AppError(
        'User account not found or inactive',
        401
      );
    }

    ok(res, rows[0], 'Profile loaded');
  } catch (error) {
    next(error);
  }
};