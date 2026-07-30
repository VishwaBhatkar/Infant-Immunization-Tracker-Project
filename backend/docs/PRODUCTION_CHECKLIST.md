# Production checklist

1. Create a database backup before applying migrations 013–016.
2. Use a unique database user with only required privileges.
3. Generate a strong JWT secret and never commit `.env`.
4. Set `NODE_ENV=production` and exact HTTPS origins in `CORS_ORIGINS`.
5. Set `TRUST_PROXY=1` only when deployed behind one trusted reverse proxy.
6. Terminate TLS at the reverse proxy or hosting platform.
7. Run migrations in numeric order and verify rollback scripts separately.
8. Create the first System Admin through a controlled seed/administrative process.
9. Test Parent, Doctor, Hospital Admin and System Admin access boundaries.
10. Verify audit-log writes for create, update, deactivate, delete, restore and password-reset actions.
11. Configure database backups, log retention and monitoring alerts.
12. Run `npm run check` and `npm test` before deployment.
