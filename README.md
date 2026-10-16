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
The demo company is **Group LAN BTP** (name and logo are editable under *Company settings*, so every company brands its own workspace).

| Where | Email | Role | What they can do |
|---|---|---|---|
| Web | ceo@mac-construction.cm | General Director | Everything, including roles, client releases and company settings |
| Web | engineer@mac-construction.cm | Engineer | Views assigned projects, reports, deliveries, workforce, media. Creates and locks weekly reports. Cannot create or edit projects, tasks or finances |
| Web | secretary@mac-construction.cm | Secretary | Budgets and expenses (view, add, edit), reports, project information. Cannot delete expenses, edit budgets, manage users or the client portal |
| Web | client@ordre-avocats.cm | Client | Client portal: only what the Director released |
| Mobile and web | foreman@mac-construction.cm | Site Foreman | Maison des Avocats. Can sign in on the phone app or on the web (same account, same permissions) |
| Mobile | carine@mac-construction.cm | Site Foreman | Kribi Port Warehouse |
| Isolation check | director@rival-btp.cm | Other company | Sees nothing of the demo company's data |

## Updating an existing database
```
cd backend
npm run migrate   # keeps your data: adds the Secretary role and new permissions, converts old report photos, rebuilds indexes
npm run seed      # alternative: wipes everything and reloads the demo data
npm run verify    # checks that dashboards agree with the saved records
```
After `npm run migrate`, existing tasks are not linked to timeline stages and there are no storage locations until you create them (Material transfers, Add a location).

The client portal is now deny-by-default. After migrating, existing projects show clients nothing until the Director releases it (Project > Client portal).

## What V4 adds (Group LAN BTP requirements)
- **Approvals with confirmation and revocation:** Approve and Reject open a confirmation dialog naming the record. Approved records can be revoked with a required reason; they go back to pending. The original approval stays in the history (who, when, why). Two people acting at once cannot both succeed, and a stale screen is told the record changed. Revoking attendance is refused once a locked weekly report covers the day.
- **Monthly reports and annual overview:** Reports now has Daily, Weekly, Monthly and Annual. Everything is recalculated from stored records: expenses (month and year to date, by category and project), work completed, workforce, deliveries, stock movements, materials used, difficulties. Months with no records show a dash and a note, never a silent zero. Progress at month end is only shown where a weekly report exists. The annual total is checked against the twelve months and the raw records. Print uses the existing print layout (save as PDF from the browser).
- **Clickable timeline stages:** every stage opens a detail panel with description, planned and actual dates, completion, linked tasks, reports, weekly reports, photos and videos, materials used, difficulties, delays and outstanding work. Link tasks to a stage in the Tasks tab (edit a task, choose the stage). Nothing is copied: media and reports stay where they were recorded.
- **Material transfers:** record a transfer between warehouses, other storage and project sites. One exit and one entry are written together, a transfer is never counted as a purchase or delivery, negative stock is refused, retries do not repeat it, and every movement is kept in the history. Project stock tables show transfers in their own columns.
- **Assets register:** vehicles, machinery, equipment and tools with status, condition, location and assigned project, plus maintenance notes. The Director edits. Engineer and Secretary view only. Foremen have no access on the web or on the phone.
- **Foreman on the web:** foremen sign in on the web with the same account. They get a phone-friendly interface for attendance and the workforce register, deliveries, the daily report, the weekly report and photos. It needs an internet connection; the phone app is the one that works offline.
- **Responsive web:** mobile menu, dialogs that fit small screens, tables that scroll inside their panel, larger touch targets.
- **Nexus branding:** preloader, "Powered by" footer and splash screen (see `web/src/nexus/README.md`).

## Tests
```
cd backend
npm test        # unit tests for permissions, approval rules, monthly and annual maths, transfer rules, signed links
npm run verify  # checks stored data for consistency (needs a database)
```
The unit tests need no database. There are no automated tests yet for the HTTP routes or the web screens.

## What V3 adds
- **Workforce register (foreman app):** register and remove workers, pick who is present. Removing a worker marks them inactive. Past attendance keeps the name it was recorded with. Duplicate names and double attendance on one day are refused. Works offline.
- **Manual task percentages:** the foreman can enter a task's percentage in the daily report (0 to 100). It is saved as entered, shown next to the quantity-based figure, and used in project progress until cleared. The Director can also set or clear it in the Tasks tab.
- **Deliveries (foreman app):** record, edit and delete, with the delivering company or store, unit, date and notes. Editing or deleting corrects stock, alerts and the purchase order in one step, and is refused if the stock has already been used. Deliveries without an order are allowed. Works offline.
- **Engineer limits:** enforced on the server. No project creation or editing, no task editing.
- **Reports:** one Reports area with Daily and Weekly. Tables, filters (project, dates), a detail view, and print layouts with the company name, logo and period. Weekly reports are built from the live tasks and the week's daily reports, can be edited while a draft, then locked.
- **Secretary role and expenses:** an expense register per project with categories, receipts and totals. Project "spent" becomes the sum of the expenses.
- **Photos and videos on daily reports:** upload with progress, type and size checks, retry. Photos up to 8 MB, videos up to 60 MB.
- **Client release controls:** per project switches for progress, timeline, photos, videos, reports and statistics, plus per item release of tasks, milestones, photos, videos and reports. Enforced on the server.
- **Live figures:** dashboards and tables refresh every 30 seconds and when you return to the tab.
- **Company settings:** the Director edits the company name and logo, shown in the header, on printed reports, in the client portal and on the foreman app.

## Weekly reports
The working week is **Monday to Saturday**. The weekly report builds itself: the first daily report of a week creates it, and every later daily report refreshes it while it is still a draft. The foreman opens it in the app (Weekly report), adds planned percentages, reasons and observations, and sends it to the office. The Engineer or Director can edit, then lock it. A locked report never changes. The Director can release a locked report to the client.

## Media storage
Without Cloudinary credentials, photos and videos are kept on the server disk, which Render wipes on every deploy, and they are served through expiring signed links. For real use set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` on the backend. Cloudinary files are stored permanently, and their links are long unguessable URLs that are only ever sent to authorised users, but they are not time-limited.

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
