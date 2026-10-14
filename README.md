# Accounts Task Management System

A production-grade, mobile-first **Accounts Task Management System** with a dedicated **Large-Screen Live Task Board** for an industrial manufacturing plant. Connected to **Google Sheets** through a centralized **Google Apps Script Web App** backend and **Google Drive** for file storage, styled with a refined Neumorphic design system.

---

## 1. System Architecture

- **Frontend**: React 19 + TypeScript + Tailwind CSS with custom Neumorphism design system.
- **Backend API**: Google Apps Script (`Code.gs`) deployed as a Web App (`doGet` / `doPost`).
- **Database**: Google Sheets (6 automated sheets: `TASKS`, `EMPLOYEES`, `TASK_HISTORY`, `EXTENSION_REQUESTS`, `EMPLOYEE_SCORECARD`, `APP_CONFIG`).
- **File Storage**: Google Drive dedicated folder (`Accounts_Task_Attachments`).
- **Timezone**: `Asia/Kolkata` (IST - India Standard Time).
- **Points Scoring**: Strict server-side deadline calculation engine.
  - On or before original deadline: **+5 Points**
  - On or before approved extended deadline: **+5 Points**
  - Completed after applicable deadline: **0 Points**
  - Extension requested but completed after effective deadline: **0 Points**
  - Cancelled tasks: **0 Points**

---

## 2. Features Overview

### A. Large-Screen Live Task Board (Office TV Monitor)
- **Active Tasks Only**: Completed and cancelled tasks are instantly excluded from the active view.
- **Auto-Refresh**: Polls the backend every 20 seconds without full-page reloads, preserving active search and filters.
- **Live IST Clock**: Displays the current date and time in India Standard Time.
- **KPI Summary**: Real-time counter of Active, Due Soon (<2 hours), Overdue, and Extension Requested tasks.
- **Fullscreen TV Mode**: Dedicated monitor toggle for wall-mounted displays.
- **Visual Status Badges**: Upcoming, In Progress, Due Soon, Overdue, Extension Requested, and Extension Approved.

### B. Mobile-Friendly Task Creation
- **Regular vs. Hourly Tasks**: Supports standard milestones and fixed-duration hourly assignments.
- **Start and Deadline Validation**: Guarantees end deadline strictly follows start date/time.
- **Role Assignment**: Automatically assigns by the authenticated creator to authorized accounts employees.
- **File Attachments**: Direct uploads of purchase invoices, vendor bills, bank statements (PDF, Excel, Word).
- **Double-Click Protection**: Immediate submit locking with loading feedback.

### C. Task Status Progression & Completion
- **Lifecycle Workflow**: `Assigned` → `Acknowledged` → `In Progress` → `Blocked` → `Extension Requested` → `Completed`.
- **Completion Remarks**: Mandatory notes and voucher numbers recorded before submitting.
- **Server Timestamp Verification**: Evaluates on-time status against server clock to prevent clock tampering.
- **Scorecard Update**: Automatically increments total completed, on-time or late counts, and total points.

### D. Deadline Extension & Approval Governance
- **Employee Request**: Mandatory blocker reason and proposed new deadline.
- **Effective Deadline Protection**: Original deadline remains binding while request is pending.
- **Role-Based Review**: Only Managers and Administrators can review and approve/reject extensions.
- **Approval Audit Trail**: Records who approved, when, reason, and new approved deadline.

### E. Performance Leaderboard & Scorecard
- Real-time ranking of Accounts Department team members.
- Metrics: Tasks Assigned, Tasks Completed, On-Time Completions, Late Completions, Approved Extension Completions, Total Points, and On-Time Rate %.

---

## 3. Google Sheets & Apps Script Setup (5 Minutes)

### Step 1: Create Your Google Sheet
1. Open Google Sheets ([sheets.new](https://sheets.new)).
2. Name the spreadsheet: `ALFA INTERCONTINENTAL LIMITED - Accounts Task System`.

### Step 2: Open Apps Script Editor
1. In the Google Sheets menu, click **Extensions → Apps Script**.
2. Rename the project to `Accounts Task API`.
3. Delete any default code in `Code.gs`.
4. Copy the entire contents of the `Code.gs` file from this repository and paste it into the editor.

### Step 3: Initialize Database Tabs & Drive Folder
1. In the Apps Script toolbar dropdown, select the function:
   ```
   setupAccountsTaskSystem
   ```
2. Click **Run**.
3. A popup will ask for permissions to access your Google Sheet and Google Drive. Click **Review permissions** → Select your Google account → Click **Advanced** → Click **Go to Accounts Task API (unsafe)** → Click **Allow**.
4. The script will automatically create:
   - `TASKS` (with all 32 required columns)
   - `EMPLOYEES` (seeded with Accounts Department team)
   - `TASK_HISTORY` (audit trail log)
   - `EXTENSION_REQUESTS` (extension governance)
   - `EMPLOYEE_SCORECARD` (points and performance leaderboard)
   - `APP_CONFIG` (application configuration)
   - Google Drive Folder `Accounts_Task_Attachments` for file uploads.
5. You will see a success confirmation dialog.

### Step 4: Deploy as a Web App
1. At the top right of the Apps Script editor, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set the following fields:
   - **Description**: `Accounts Task API v1`
   - **Execute as**: `Me (your Google email)`
   - **Who has access**: `Anyone` *(Note: this enables the frontend React SPA to communicate with your sheet via CORS POST/GET)*.
4. Click **Deploy**.
5. Copy the generated **Web app URL** (starts with `https://script.google.com/macros/s/.../exec`).

### Step 5: Connect Frontend to Your Google Sheet
1. In the Accounts Task Management Web App, click the **Settings / Database** icon in the top navigation bar.
2. Paste your deployed Web App URL into the field.
3. Click **Save & Test**.
4. The system will perform an instantaneous health check and connect live!

---

## 4. Environment Configuration

You can also pre-configure the URL at build time:
In `.env` or `.env.local`:
```env
VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYED_ID/exec"
```

If no URL is configured, the app operates in **Local Demonstration Mode**, storing realistic industrial manufacturing records in browser storage so every feature can be tested immediately.

---

## 5. Role-Based Access Control (RBAC)

The app includes an in-app **Role Switcher** in the top bar to verify permissions:

| Feature | Administrator (Rajesh Sharma) | Manager (Priya Nair) | Employee (Amit Patel, Sunita Rao, etc.) |
|---|:---:|:---:|:---:|
| View Live Board | ✅ | ✅ | ✅ |
| Create & Assign Tasks | ✅ | ✅ | ❌ |
| Update Task Status | ✅ | ✅ | ✅ |
| Request Extension | ✅ | ✅ | ✅ |
| Approve / Reject Extension | ✅ | ✅ | ❌ |
| Complete Task | ✅ | ✅ | ✅ |
| View Scorecards & Reports | ✅ | ✅ | ✅ |
| Configure Database Settings | ✅ | ❌ | ❌ |

---

## 6. Testing & Quality Assurance

A built-in test suite verifies all deadline and point calculations directly in the UI under **Settings → Run Tests**:
1. Scenario 7: Completed on or before original deadline awards 5 points.
2. Scenario 8: Completed after deadline awards 0 points.
3. Scenario 10: Completed before approved extended deadline awards 5 points.
4. Scenario 11: Completed after approved extended deadline awards 0 points.
5. Scenario 10 Pending: Extension requested but completed after effective deadline awards 0 points.
6. Countdown: Identifies Due Soon (< 2 hours) and Overdue status.

---

## 7. GitHub Pages Deployment

### Published Repository URL
`https://theprocesswallah-prog.github.io/ACCOUNTS-TASK-MANAGEMENT-SYSTEM/`

### Root Cause of Initial 404
When GitHub Pages is configured to deploy directly from the `main` branch root folder (`/`), it serves the raw development `index.html` which contains `<script type="module" src="/src/main.tsx"></script>`. Because GitHub Pages does not run the Vite bundler at runtime and browsers cannot execute raw TypeScript files, a 404 error occurs.

### Fix Applied
1. **Base Path Configured (`vite.config.ts`)**:
   `base: '/ACCOUNTS-TASK-MANAGEMENT-SYSTEM/'` ensures all assets are referenced with the repository prefix.
2. **Production Asset Bundling**:
   `npm run build` processes `index.html`, transpiles TypeScript, bundles Tailwind CSS, and outputs production assets into `dist/` with paths prefixed by `/ACCOUNTS-TASK-MANAGEMENT-SYSTEM/assets/`.
3. **Favicon Assets**:
   Provided `public/favicon.svg` and `public/favicon.ico` so the browser never experiences a 404 on `favicon.ico`.
4. **SPA Routing & Jekyll Bypass**:
   Build automatically generates `dist/404.html` (for direct link routing such as `/task-request`) and `dist/.nojekyll`.
5. **Automated GitHub Actions Deployment**:
   `.github/workflows/deploy.yml` builds and deploys `./dist` to GitHub Pages automatically on push.

### Deployment Method 1: GitHub Actions (Recommended)
1. Commit all files including `.github/workflows/deploy.yml`, `vite.config.ts`, `index.html`, and `public/`:
   ```bash
   git add .
   git commit -m "Fix GitHub Pages deployment pipeline, base path, and favicon"
   git push origin main
   ```
2. In your GitHub repository:
   - Navigate to **Settings** → **Pages**.
   - Under **Build and deployment** → **Source**, change the dropdown from `"Deploy from a branch"` to **"GitHub Actions"**.
   *(Note: If you leave it set to "Deploy from a branch", GitHub Pages will continue serving the unbuilt root repository files and ignore the workflow!)*
3. Check the **Actions** tab on GitHub:
   - You will see the **Deploy to GitHub Pages** workflow running.
   - Once it completes with a green checkmark, the live website will be updated and functional.

### Deployment Method 2: Deploy from Branch (/docs folder)
If your repository or organization permissions restrict GitHub Actions:
1. Run `npm run build:docs` to compile into the `docs/` folder.
2. In your GitHub repository:
   - Navigate to **Settings** → **Pages**.
   - Under **Build and deployment** → **Source**, select **"Deploy from a branch"**.
   - Select Branch: `main` and Folder: `/docs`.
   - Click **Save**.
3. Push the `docs/` directory to GitHub:
   ```bash
   npm run build:docs
   git add docs
   git commit -m "Build production app into docs/ folder"
   git push origin main
   ```
