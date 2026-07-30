# Admin login setup

Admin roles are intentionally excluded from public registration. Public registration accepts only `PARENT` and `DOCTOR`.

## 1. Install backend dependencies

From the backend directory:

```powershell
npm install
```

If only the password package is missing:

```powershell
npm install bcryptjs
```

## 2. Configure the first System Admin

PowerShell:

```powershell
$env:ADMIN_NAME="Vishwa Admin"
$env:ADMIN_EMAIL="admin@gmail.com"
$env:ADMIN_PHONE="9876543210"
$env:ADMIN_PASSWORD="Admin@12345678"
$env:ADMIN_ROLE="SYSTEM_ADMIN"
npm run admin:create
```

The script loads the normal backend `.env` file for database configuration.

## 3. Log in

Use the normal application login screen with the Admin email and password. The backend returns the database role and the frontend should route `SYSTEM_ADMIN` to `/(system-admin)` and `HOSPITAL_ADMIN` to `/(hospital-admin)`.

## Hospital Admin

```powershell
$env:ADMIN_NAME="Hospital Admin"
$env:ADMIN_EMAIL="hospitaladmin@gmail.com"
$env:ADMIN_PHONE="9876543211"
$env:ADMIN_PASSWORD="Hospital@123456"
$env:ADMIN_ROLE="HOSPITAL_ADMIN"
$env:ADMIN_HOSPITAL_ID="1"
npm run admin:create
```
