# TaskList Manager 📝🚀

A modern full-stack task list and project management web application built with **React**, **Node.js + Express**, **Tailwind CSS**, and **MongoDB Atlas** / cloud persistence.

---

## ✨ Features

- **Multi-List Management:** Organize tasks into distinct workspaces (e.g. *Frontend Learning*, *Backend Learning*, *Sprint Tasks*).
- **Bulk Task Input:** Paste multiple task lines at once with automated numbering and bullet cleaning (`1. `, `1) `, `- `, `* `, `• `).
- **Progress Tracking:** Dynamic completion percentage bars with celebratory confetti when reaching 100%.
- **Authentication & Security:**
  - Email/Password sign up and login with `bcryptjs` password hashing.
  - Stateful JWT token verification with automated session persistence across reloads.
  - Multi-user isolation (IDOR protection) ensuring users only see their own lists.
  - Password reset flow.
  - 1-Click Demo Login (`Guna`) for rapid evaluation.
- **Search & Filtering:**
  - Real-time search by task name.
  - Filter by **All**, **Active**, and **Completed**.
  - Inline title editing and task reordering (up/down).
- **Theme Support:** Polished **Dark Mode** and **Light Mode** with automatic system preference detection.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti, React Router DOM
- **Backend:** Node.js, Express.js, TypeScript (tsx)
- **Database:** MongoDB Atlas (Mongoose) with automatic zero-config persistent disk database fallback
- **Authentication:** JWT (JSON Web Tokens), bcryptjs

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your variables:
```env
# Optional MongoDB Atlas connection string:
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/taskmanager?retryWrites=true&w=majority"

# JWT Secret:
JWT_SECRET="your-super-secret-key"

PORT=3000
```
> *Note: If `MONGODB_URI` is omitted, the application automatically uses the built-in persistent disk database in `./data/db.json`.*

### 4. Running the App
```bash
# Start development server (Node + Express + Vite middleware)
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 📡 API Overview

### Authentication
- `POST /api/auth/register` — Create a new account
- `POST /api/auth/login` — Sign in with email and password
- `POST /api/auth/demo` — 1-Click demo account login
- `POST /api/auth/google` — Sign in via Google account
- `POST /api/auth/forgot-password` — Generate password reset token
- `POST /api/auth/reset-password` — Set new password using token
- `GET  /api/auth/me` — Get current logged-in user profile

### Task Lists
- `GET    /api/lists` — Retrieve user's task lists with progress stats
- `POST   /api/lists` — Create a new task list
- `GET    /api/lists/:id` — Get task list details & tasks
- `PUT    /api/lists/:id` — Update list title/color/description
- `DELETE /api/lists/:id` — Delete task list and its tasks

### Tasks
- `GET    /api/lists/:listId/tasks` — List tasks in a task list
- `POST   /api/lists/:listId/tasks` — Add single task
- `POST   /api/lists/:listId/tasks/bulk` — Add array of tasks (auto-sanitizing numbering/bullets)
- `PUT    /api/tasks/:id` — Update task status or title
- `PUT    /api/lists/:listId/tasks/reorder` — Reorder tasks
- `DELETE /api/tasks/:id` — Delete a task
- `DELETE /api/lists/:listId/tasks/completed` — Clear all completed tasks in a list

---

## 🔒 Security
- Passwords are salted and hashed using `bcrypt` (10 rounds).
- All task lists and task queries enforce strict ownership checks (`userId`).
- Unauthenticated requests are rejected with `401 Unauthorized`.
- Attempts to access other users' data return `403 Forbidden`.
