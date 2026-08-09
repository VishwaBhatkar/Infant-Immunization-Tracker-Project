/**
 * File: backend/src/app.js
 * Purpose: Bootstraps the backend application, shared middleware, routes, and server lifecycle.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { pool } from './config/db.js';
import { requestContext } from './middleware/securityMiddleware.js';

const app = express();

const trustProxyValue = String(process.env.TRUST_PROXY || '').trim().toLowerCase();
if (trustProxyValue && !['false', '0', 'off', 'no'].includes(trustProxyValue)) {
  const numericTrustProxy = Number(trustProxyValue);
  app.set('trust proxy', Number.isNaN(numericTrustProxy) ? process.env.TRUST_PROXY : numericTrustProxy);
}

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8081,http://localhost:19006')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isDevelopmentOrigin = (origin) => {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  } catch {
    return false;
  }
};

app.disable('x-powered-by');
app.use(requestContext);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isDevelopmentOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});

app.use('/api', apiLimiter, routes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'child-vaccination-api' }));
app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
});
app.use(notFound);
app.use(errorHandler);

export default app;
