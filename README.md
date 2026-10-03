# Chantier360

Construction operations platform for Cameroonian civil engineering firms. Prototype with demo data.

- `web/` HQ Operations Portal (React + Vite)
- `mobile/` Site Foreman App (React Native + Expo, Android)

## Run the HQ portal
```
cd web
npm install
npm run dev
```
Open the printed address. Sign in with a demo account, or click any account card to enter directly.

| Role | Email | Password |
|---|---|---|
| Chief Executive | ceo@mac-construction.cm | demo1234 |
| Operations Director | operations@mac-construction.cm | demo1234 |
| Project Manager | pm@mac-construction.cm | demo1234 |

## Run the foreman app
```
cd mobile
npm install
npx expo start
```
Scan the QR code with Expo Go on an Android phone.

| Foreman | Email | Password |
|---|---|---|
| Fon Emmanuel (Bastos, Yaoundé) | foreman@mac-construction.cm | demo1234 |
| Essomba Carine (Kribi) | carine@mac-construction.cm | demo1234 |

Demo tip: on the home screen, switch the connection toggle off, log a short delivery, then switch it back on to watch the offline queue send automatically.

## How the three parts connect
Both apps now talk to the backend. Sign in on either app and the data comes from MongoDB Atlas.
- Web: set `VITE_API_URL` (see `web/.env.example`). On Render, add it under the Static Site's environment settings and redeploy.
- Mobile: set `EXPO_PUBLIC_API_URL` in `mobile/eas.json` (both build profiles) to your Render API URL, then rebuild.
- Backend: run `npm run seed` again after updating, because purchase orders and site wage rates were added.
- Both apps support English and French, and light and dark mode (the choice is remembered).
- Foremen deliver against purchase orders created by head office, so the ordered quantity comes from the server, not the phone.
- Photos go to Cloudinary when `CLOUDINARY_*` variables are set on the backend. Without them they are lost on each Render deploy.

## Backend (`backend/`)
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
