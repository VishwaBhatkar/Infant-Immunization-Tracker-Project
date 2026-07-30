# Admin API

Base URL: `/api`

All Admin endpoints require `Authorization: Bearer <JWT>`. System-level endpoints require `SYSTEM_ADMIN`. Responses containing Admin data use `Cache-Control: no-store`.

## Admin users

- `GET /admin/admin-users`
- `POST /admin/admin-users`
- `GET /admin/admin-users/:id`
- `PUT /admin/admin-users/:id`
- `PATCH /admin/admin-users/:id/status`
- `POST /admin/admin-users/:id/reset-password`
- `DELETE /admin/admin-users/:id`
- `PATCH /admin/admin-users/:id/restore`

## Users and doctors

- `GET /admin/users`
- `GET /admin/users/:id`
- `PATCH /admin/users/:id/status`
- `DELETE /admin/users/:id`
- `PATCH /admin/users/:id/restore`
- `GET /admin/doctors`
- `POST /admin/doctors`
- `GET /admin/doctors/:id`
- `PUT /admin/doctors/:id`
- `PATCH /admin/doctors/:id/status`
- `DELETE /admin/doctors/:id`
- `PATCH /admin/doctors/:id/restore`

## Hospitals and children

- `GET /admin/hospitals`
- `POST /admin/hospitals`
- `GET /admin/hospitals/:id`
- `PUT /admin/hospitals/:id`
- `PATCH /admin/hospitals/:id/status`
- `DELETE /admin/hospitals/:id`
- `PATCH /admin/hospitals/:id/restore`
- `GET /admin/children`
- `GET /admin/children/:id`

## Notifications and reports

- `GET /admin/notifications`
- `GET /admin/notifications/statistics`
- `GET /admin/notifications/:id`
- `POST /admin/notifications/send`
- `POST /admin/notifications/:id/retry`
- `PATCH /admin/notifications/:id/cancel`
- `GET /admin/reports/overview`
- `GET /admin/reports/overdue-vaccines`

## Operations

- `POST /admin/reminders/run`
- `POST /admin/push/send-pending`
- `POST /admin/push/check-receipts`

## Status codes

- `200/201`: successful request
- `401`: missing, invalid or expired token
- `403`: authenticated user lacks permission
- `409`: duplicate or protected-data conflict
- `422`: validation failure
- `429`: rate limit exceeded
