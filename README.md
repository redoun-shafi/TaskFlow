# TaskFlow - Modern SaaS Task & Team Management Platform

TaskFlow is a production-grade web application built with React 19, TypeScript, Vite, Tailwind CSS, and Firebase. It provides team workspaces, interactive Kanban boards, calendar views, task assignments, activity streams, real-time notifications, and comprehensive role-based access control.

---

## Features

- **Authentication & Security**: Email/password registration, login, logout, password reset, email verification, persistent sessions, and hardened Firestore & Storage Security Rules.
- **Teams & Workspaces**: Create teams, invite members by email, manage team roles (`OWNER`, `ADMIN`, `MEMBER`), and transfer ownership or leave teams.
- **Tasks & Workflows**: Task creation, editing, status tracking (`TODO`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`), priority tags (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), due dates, labels, file attachments, and markdown descriptions.
- **Multiple Views**:
  - **Dashboard**: High-level KPI metrics, tasks due today, overdue tasks, team activity, and quick actions.
  - **Kanban Board**: Drag-and-drop & column-based task workflows with instant updates.
  - **List View**: Dense, searchable, and filterable table of tasks.
  - **Calendar View**: Monthly schedule of tasks organized by due dates.
  - **My Tasks**: Focused view of tasks assigned to or authored by the current user.
- **Collaboration & Auditing**:
  - Task comments with author controls.
  - In-app notifications for team invitations, assignments, and updates.
  - Comprehensive audit trail / activity log.
- **Modern SaaS UI**: Responsive desktop sidebar, mobile drawer, high-contrast typography (Plus Jakarta Sans & Inter), and fluid interaction design.

---

## 1. Configure Firebase

1. Create a project in the [Firebase Console](https://console.firebase.google.com).
2. Register a Web App in Project Settings.
3. Copy the configuration credentials into `firebase-applet-config.json` or environment variables:
   ```json
   {
     "projectId": "your-firebase-project",
     "appId": "your-app-id",
     "apiKey": "your-api-key",
     "authDomain": "your-firebase-project.firebaseapp.com",
     "firestoreDatabaseId": "(default)",
     "storageBucket": "your-firebase-project.firebasestorage.app",
     "messagingSenderId": "your-sender-id"
   }
   ```

---

## 2. Enable Email/Password Authentication

1. Go to **Authentication** in the Firebase Console.
2. Click **Get Started** (if not already enabled).
3. Select **Sign-in method** tab.
4. Click on **Email/Password**, toggle **Enable**, and save.
5. (Optional) Enable **Google** provider if 1-click Google Sign-In is desired.

---

## 3. Configure Firestore

1. In the Firebase Console, navigate to **Firestore Database**.
2. Click **Create Database**.
3. Choose your database location and start in Production or Test mode (the security rules will be deployed in step 5).

---

## 4. Configure Storage

1. Navigate to **Storage** in the Firebase Console.
2. Click **Get Started**.
3. Choose default bucket security settings and cloud region.

---

## 5. Deploy Security Rules

Using the Firebase CLI:
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy Firestore & Storage rules
firebase deploy --only firestore:rules,storage:rules
```

---

## 6. Deploy Indexes

Deploy compound indexes defined in `firestore.indexes.json`:
```bash
firebase deploy --only firestore:indexes
```

---

## 7. Run Locally

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 8. Build for Production

```bash
# Type check and build optimized bundle
npm run build
```
Production static assets will be compiled to `dist/`.

---

## 9. Deploy the Application

Deploy directly to Firebase Hosting:
```bash
firebase init hosting
firebase deploy --only hosting
```
Or containerize with Docker / Cloud Run using the integrated production runner.
