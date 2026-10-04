import express from 'express';
import dotenv from 'dotenv';
import { initDatabase, getDatabaseStatus } from './db.js';
import { authMiddleware } from './middleware/auth.js';
import * as authController from './controllers/authController.js';
import * as listController from './controllers/listController.js';
import * as taskController from './controllers/taskController.js';

dotenv.config();

const app = express();

let dbInitialized = false;
let dbInitPromise: Promise<void> | null = null;

export async function ensureDbInitialized() {
  if (!dbInitialized) {
    if (!dbInitPromise) {
      dbInitPromise = initDatabase().then(() => {
        dbInitialized = true;
      });
    }
    await dbInitPromise;
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS and Security headers for all environments (including Vercel & Render)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Create API router
const router = express.Router();

// Auto-initialize DB on any API request
router.use(async (req, res, next) => {
  try {
    await ensureDbInitialized();
    next();
  } catch (err) {
    console.error('Database initialization error:', err);
    next();
  }
});

// Database info endpoint
router.get('/health', (req, res) => {
  const status = getDatabaseStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: status,
  });
});

// Authentication routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/google', authController.googleAuth);
router.post('/auth/demo', authController.demoLogin);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.post('/auth/logout', (req, res) => {
  res.json({ message: 'Successfully logged out.' });
});
router.get('/auth/me', authMiddleware as any, authController.getMe as any);
router.put('/auth/profile', authMiddleware as any, authController.updateProfile as any);

// Task Lists routes (protected)
router.get('/lists', authMiddleware as any, listController.getLists as any);
router.post('/lists', authMiddleware as any, listController.createList as any);
router.put('/lists/reorder', authMiddleware as any, listController.reorderLists as any);
router.get('/lists/:id', authMiddleware as any, listController.getListById as any);
router.put('/lists/:id', authMiddleware as any, listController.updateList as any);
router.delete('/lists/:id', authMiddleware as any, listController.deleteList as any);

// Tasks routes (protected)
router.get('/tasks', authMiddleware as any, taskController.getAllTasks as any);
router.get('/lists/:listId/tasks', authMiddleware as any, taskController.getTasksByList as any);
router.post('/lists/:listId/tasks', authMiddleware as any, taskController.createTask as any);
router.post('/lists/:listId/tasks/bulk', authMiddleware as any, taskController.bulkAddTasks as any);
router.put('/lists/:listId/tasks/reorder', authMiddleware as any, taskController.reorderTasks as any);
router.delete('/lists/:listId/tasks/completed', authMiddleware as any, taskController.clearCompletedTasks as any);
router.put('/tasks/:id', authMiddleware as any, taskController.updateTask as any);
router.delete('/tasks/:id', authMiddleware as any, taskController.deleteTask as any);

// Mount router on both '/api' and '/' so it handles both Vercel rewrites and standard Express paths
app.use('/api', router);
app.use('/', router);

export default app;
