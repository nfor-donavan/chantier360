# Chantier360

Construction operations platform for Cameroonian civil engineering firms. Prototype with demo data.

- `web/` HQ Operations Portal (React + Vite)
- `mobile/` Site Foreman App (React Native + Expo, Android)

## Run the HQ portal
```
cd web && npm install && npm run dev
```
Set `VITE_API_URL` (see `web/.env.example`) to point at your backend.

## Demo accounts (password for all: `demo1234`)
| Where | Email | Role | What they see |
|---|---|---|---|
| Web | ceo@mac-construction.cm | General Director | Everything: all projects, finances, roles and access, client portal controls |
| Web | engineer@mac-construction.cm | Engineer | Only assigned projects, no finances, no user management |
| Web | client@ordre-avocats.cm | Client | Client portal only: approved progress, timeline, photos |
| Mobile | foreman@mac-construction.cm | Site Foreman | Maison des Avocats |
| Mobile | carine@mac-construction.cm | Site Foreman | Kribi Port Warehouse |
| Isolation check | director@rival-btp.cm | Other company | Sees nothing of MAC's data |

## Backend
```
cd backend && npm install
npm run seed   # wipes and reloads the demo data (required after this update)
npm run dev
```
`.env` needs `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGINS` (web URL) and optionally the three `CLOUDINARY_*` values for permanent photo storage.

## Foreman app
```
cd mobile && npm install && npx expo install --check
eas build -p android --profile preview
```
Set `EXPO_PUBLIC_API_URL` in `mobile/eas.json` to your backend URL.

## What V2 adds
- **Permissions:** User, Role, Permissions. Roles are stored per company and editable on the "Roles & access" page. Every API route checks a named permission, so hiding a menu item is never the only protection. Financial fields are removed from responses for anyone without the financial permission.
- **Attendance without wages:** attendance records headcount by configurable workforce category. Pay is a separate concern and is not stored.
- **No hard-coded business data:** budgets, spending, dates, phases, clients and progress live in the database. Budget and spending are entered in Project > Settings and show who entered them and when.
- **Clickable projects:** overview, quantity-based tasks (subcontractor, unit, total, cumulative, weekly, target, observation), timeline, photo gallery, stock, daily reports, settings. "Print status report" produces the weekly state of the site.
- **Progress is calculated:** each task's percentage is cumulative divided by total, and project progress is the weighted average of its tasks, grouped by trade.
- **Client portal:** a separate login that returns an explicit whitelist: progress, timeline, tasks and photos marked "visible to client", and published updates. No budgets, wages, subcontractors, reports or stock.
- **Daily report (mobile, offline):** work done with quantities, workforce by category, equipment used, stock entries and exits, difficulties and solutions, tomorrow's programme, orders, site cash, photos. Submitting it updates task progress and stock.
- **Stock:** opening + entries - exits = closing, per item. Deliveries add stock automatically.
- **Dashboards by role:** each user only gets the sections their permissions allow.
- **English and French, light and dark mode** on web and mobile.

## API reference (backend/)
Node.js + Express + Mongoose on MongoDB Atlas. One shared database, every record carries a `tenantId`, and a Mongoose plugin refuses any query that does not filter by it.

```
cd backend
npm install
npm run seed     # loads MAC Construction Co. demo data and a second company for isolation checks
npm run dev      # http://localhost:4000/health
```
The `.env` file holds your Atlas connection string (database name: `chantier360`). It is git-ignored. Never commit it.

| Method | Route | Who | Purpose |
|---|---|---|---|
| POST | /api/auth/login | all | Returns a JWT carrying tenant, role and site |
| GET | /api/auth/me | all | Current user |
| GET/POST/PATCH | /api/sites | HQ writes, foreman reads own site | Project sites |
| GET/POST | /api/materials/logs | all (foreman limited to own site) | Deliveries; short ones are flagged and raise an alert |
| GET/POST/PATCH | /api/materials/requests | HQ decides | Material requests |
| GET/POST/PATCH | /api/attendance | HQ approves | Daily labour logs, headcount anomaly check |
| POST | /api/sync | all | Offline batch upload, safe to retry (clientId) |
| POST | /api/uploads | all | Photo upload, returns a URL |
| GET/PATCH | /api/alerts | HQ | Alert list and acknowledge |
| GET | /api/dashboard | HQ | Headline figures |

## Deploy
1. Push to GitHub (one repository with `web`, `mobile`, `backend`).
2. Render: New Web Service, root directory `backend`, build `npm install`, start `npm start`. Set `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGINS`, `PUBLIC_URL`. A `render.yaml` blueprint is included.
3. Atlas: Network Access must allow Render (0.0.0.0/0 for the prototype).
4. Android build: `cd mobile && npx eas-cli build -p android --profile preview` produces an installable APK.
