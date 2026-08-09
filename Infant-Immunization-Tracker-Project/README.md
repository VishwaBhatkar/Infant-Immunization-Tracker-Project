# Infant Immunization & Health Tracker

A full-stack child vaccination and health-management system built with React Native (Expo), Node.js, Express, and MySQL. The application supports Parent, Doctor, Hospital Admin, and System Admin roles with JWT-based access control.

## Main features

- Parent registration/login, profile, child CRUD, vaccine schedule, appointments, immunization records, growth tracking, medical history, notifications, settings, help/support, and vaccination assistant.
- Doctor appointments, patient access, immunization workflows, reviews, profile, settings, and help.
- Hospital Admin doctor management, hospital appointments, vaccines, immunizations, parents, children, users, and completed-vaccination views.
- System Admin users, admins, doctors, hospitals, children, vaccines, schedules, appointments, immunizations, notifications, reports, profile, settings, and help.
- Expo push-token registration and notification preferences/logging.
- Responsive mobile/web layout with SafeArea support and protected role navigation.

## Technology stack

**Frontend:** React Native 0.81, Expo 54, Expo Router 6, React 19, Axios, React Context, SecureStore/AsyncStorage, Expo Notifications, react-native-toast-message.

**Backend:** Node.js, Express 5, MySQL2, JWT, bcryptjs, express-validator, Helmet, CORS, express-rate-limit, node-cron.

**Database:** MySQL with 26 normalized tables covering users, hospitals, children, vaccines, schedules, appointments, immunizations, growth, medical history, notifications, support, audit logs, and reviews.

## Project structure

```text
Infant-Immunization-Tracker-Project/
├── backend/
│   ├── database/
│   ├── scripts/
│   ├── src/
│   ├── test/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── assets/
│   ├── src/
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Database setup

Create a MySQL database named `child_vaccination_db`, then import the schema/seed files in `backend/database` as required by your environment.

Example:

```bash
mysql -u root -p < backend/database/schema.sql
```

## Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your own MySQL password and a strong JWT secret. Then run:

```bash
npm run check
npm test
npm run dev
```

The default API port is `5000`.

## Create a System Admin

Set the admin values in your shell and run the script. In PowerShell:

```powershell
$env:ADMIN_NAME="System Admin"
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PHONE="9876543210"
$env:ADMIN_PASSWORD="Use-A-Strong-Password"
$env:ADMIN_ROLE="SYSTEM_ADMIN"
npm run admin:create
```

The script prevents duplicate email/phone accounts.

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

For a physical Android device, set `EXPO_PUBLIC_API_URL_ANDROID` to your development computer's LAN IP, for example `http://192.168.1.10:5000/api`. The phone and computer must be on the same network and the backend must be reachable through the firewall.

Useful commands:

```bash
npm run android
npm run web
npm run lint
```

## Environment and security notes

- Real `.env` files are intentionally excluded from source control and the distributable ZIP. Copy the provided `.env.example` files to `.env` locally.
- Never place database credentials, JWT secrets, or private API keys in `EXPO_PUBLIC_*` variables because those values are exposed to the client application.
- Production must use `NODE_ENV=production`, a strong JWT secret, a non-empty database password, HTTPS frontend/API URLs, and explicit `CORS_ORIGINS` without `*`.
- Run the production configuration check with real production variables loaded:

```bash
npm run check:production
```

## Validation before submission

Backend verification:

```bash
cd backend
npm install
npm run check
npm test
```

Frontend verification:

```bash
cd frontend
npm install
npm run lint
npx expo-doctor
npm run web
```

Also test at least one real Android device/emulator and the web build for each user role before final submission.
