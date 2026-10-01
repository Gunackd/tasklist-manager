import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase, getDatabaseStatus } from './server/db.js';
import { authMiddleware } from './server/middleware/auth.js';
import * as authController from './server/controllers/authController.js';
import * as listController from './server/controllers/listController.js';
import * as taskController from './server/controllers/taskController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security & CORS headers for SPA development
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Database info endpoint
app.get('/api/health', (req, res) => {
  const status = getDatabaseStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: status,
  });
});

// Authentication routes
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/google', authController.googleAuth);
app.post('/api/auth/demo', authController.demoLogin);
app.post('/api/auth/forgot-password', authController.forgotPassword);
app.post('/api/auth/reset-password', authController.resetPassword);
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Successfully logged out.' });
});
app.get('/api/auth/me', authMiddleware as any, authController.getMe as any);
app.put('/api/auth/profile', authMiddleware as any, authController.updateProfile as any);

// Task Lists routes (protected)
app.get('/api/lists', authMiddleware as any, listController.getLists as any);
app.post('/api/lists', authMiddleware as any, listController.createList as any);
app.get('/api/lists/:id', authMiddleware as any, listController.getListById as any);
app.put('/api/lists/:id', authMiddleware as any, listController.updateList as any);
app.delete('/api/lists/:id', authMiddleware as any, listController.deleteList as any);

// Tasks routes (protected)
app.get('/api/lists/:listId/tasks', authMiddleware as any, taskController.getTasksByList as any);
app.post('/api/lists/:listId/tasks', authMiddleware as any, taskController.createTask as any);
app.post('/api/lists/:listId/tasks/bulk', authMiddleware as any, taskController.bulkAddTasks as any);
app.put('/api/lists/:listId/tasks/reorder', authMiddleware as any, taskController.reorderTasks as any);
app.delete('/api/lists/:listId/tasks/completed', authMiddleware as any, taskController.clearCompletedTasks as any);
app.put('/api/tasks/:id', authMiddleware as any, taskController.updateTask as any);
app.delete('/api/tasks/:id', authMiddleware as any, taskController.deleteTask as any);

async function startServer() {
  await initDatabase();

  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (!isProduction || !fs.existsSync(distPath)) {
    // Development mode: Vite middleware
    console.log('Mounting Vite dev server middleware...');
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    console.log('Serving production static build from dist...');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TaskList Manager server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
