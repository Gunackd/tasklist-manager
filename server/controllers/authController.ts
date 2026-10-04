import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tasklist-manager-jwt-secret-key-2026';
const TOKEN_EXPIRY = '7d';

function generateToken(userId: string, email: string): string {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.users.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.users.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
    });

    // Seed default sample task lists for great initial UX!
    const sampleList = await db.taskLists.create({
      userId: newUser._id,
      title: 'Frontend Learning',
      description: 'Core concepts, libraries, and frameworks for modern web frontend development',
      color: 'blue',
    });

    await db.tasks.createMany(sampleList._id, newUser._id, [
      { title: 'HTML & Modern Semantic Elements', tags: ['Work', 'Urgent'], categories: ['S'] },
      { title: 'CSS Flexbox, Grid & Responsive Design', tags: ['Work'], categories: ['S'] },
      { title: 'JavaScript ES6+, Promises & Async/Await', tags: ['Work', 'Personal'], categories: ['NS'] },
      { title: 'React Components, Hooks & State Management', tags: ['Work', 'Urgent'], categories: ['S'] },
      { title: 'Tailwind CSS Styling & Utility Classes', tags: ['Personal'], categories: ['S'] },
      { title: 'Redux / Context API Architecture', tags: ['Work'], categories: ['M'] },
      { title: 'Next.js Full-Stack App Routing', tags: ['Urgent', 'Personal'], categories: ['A'] },
    ]);

    // Mark the first three tasks completed so progress is visible right away!
    const createdTasks = await db.tasks.findByListId(sampleList._id);
    if (createdTasks.length >= 3) {
      await db.tasks.update(createdTasks[0]._id, newUser._id, { completed: true });
      await db.tasks.update(createdTasks[1]._id, newUser._id, { completed: true });
      await db.tasks.update(createdTasks[2]._id, newUser._id, { completed: true });
    }

    const token = generateToken(newUser._id, newUser.email);

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        avatarUrl: newUser.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Failed to create account: ' + err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.users.findByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id, user.email);

    return res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Failed to sign in: ' + err.message });
  }
}

export async function googleAuth(req: Request, res: Response) {
  try {
    const { email, name, avatarUrl } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required for Google sign in.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = await db.users.findByEmail(normalizedEmail);

    if (!user) {
      const dummyPassword = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(dummyPassword, salt);

      const displayName = name || normalizedEmail.split('@')[0];
      user = await db.users.create({
        name: displayName,
        email: normalizedEmail,
        passwordHash,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
      });

      // Seed starter lists
      const sampleList = await db.taskLists.create({
        userId: user._id,
        title: 'Backend Mastery',
        description: 'Node.js, Express, MongoDB Atlas, and RESTful API architecture',
        color: 'emerald',
      });

      await db.tasks.createMany(sampleList._id, user._id, [
        'Node.js Runtime & Event Loop',
        'Express.js Middleware & Routing',
        'MongoDB Atlas & Mongoose Schemas',
        'JWT Authentication & Security Best Practices',
        'RESTful API Design & Validation',
      ]);
    }

    const token = generateToken(user._id, user.email);

    return res.json({
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    return res.status(500).json({ message: 'Failed Google authentication: ' + err.message });
  }
}

export async function demoLogin(req: Request, res: Response) {
  try {
    const demoEmail = 'guna@taskmanager.io';
    let user = await db.users.findByEmail(demoEmail);

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('DemoPassword123!', salt);
      user = await db.users.create({
        name: 'Guna',
        email: demoEmail,
        passwordHash,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      });

      // Seed Frontend List
      const frontendList = await db.taskLists.create({
        userId: user._id,
        title: 'Frontend Development',
        description: 'Frontend roadmap: React, TypeScript, Next.js, and modern CSS architecture',
        color: 'blue',
      });

      const frontendTasks = await db.tasks.createMany(frontendList._id, user._id, [
        { title: 'HTML5 & Accessibility Standards', tags: ['Work', 'Urgent'], categories: ['S'] },
        { title: 'CSS Flexbox & CSS Grid Masterclass', tags: ['Work'], categories: ['S'] },
        { title: 'JavaScript ES2024 & Modern Patterns', tags: ['Work', 'Personal'], categories: ['NS'] },
        { title: 'React Hooks & State Architecture', tags: ['Work', 'Urgent'], categories: ['S'] },
        { title: 'Redux Toolkit & Global Store', tags: ['Work'], categories: ['M'] },
        { title: 'Next.js 15 App Router & Server Actions', tags: ['Urgent'], categories: ['A'] },
        { title: 'TypeScript Strict Mode & Generics', tags: ['Work'], categories: ['S'] },
        { title: 'Testing with Jest & Playwright', tags: ['Work'], categories: ['M'] },
        { title: 'Performance Auditing & Core Web Vitals', tags: ['Urgent'], categories: ['NS'] },
        { title: 'Tailwind CSS & Component Systems', tags: ['Personal'], categories: ['S'] },
      ]);

      // Complete 8 of 10 tasks to match user prompt: "8 / 10 completed, 80%"
      for (let i = 0; i < 8; i++) {
        await db.tasks.update(frontendTasks[i]._id, user._id, { completed: true });
      }

      // Seed Backend List
      const backendList = await db.taskLists.create({
        userId: user._id,
        title: 'Backend Development',
        description: 'Server-side engineering, database modeling, and microservices',
        color: 'emerald',
      });

      const backendTasks = await db.tasks.createMany(backendList._id, user._id, [
        { title: 'Node.js & Asynchronous Event Loop', tags: ['Work'], categories: ['S'] },
        { title: 'Express.js & Middleware Chains', tags: ['Work'], categories: ['S'] },
        { title: 'MongoDB Atlas & Database Indexing', tags: ['Work', 'Urgent'], categories: ['M'] },
        { title: 'RESTful API Endpoints & Versioning', tags: ['Work'], categories: ['S'] },
        { title: 'JWT Token Authentication & RBAC', tags: ['Urgent', 'Work'], categories: ['NS'] },
        { title: 'Redis Caching & Rate Limiting', tags: ['Work'], categories: ['M'] },
        { title: 'Docker Containers & Cloud Deployment', tags: ['Personal'], categories: ['A'] },
        { title: 'CI/CD Pipelines & Automated Testing', tags: ['Work'], categories: ['S'] },
      ]);

      // Complete 3 of 8 tasks to match prompt: "3 / 8 completed, 38%"
      for (let i = 0; i < 3; i++) {
        await db.tasks.update(backendTasks[i]._id, user._id, { completed: true });
      }
    }

    const token = generateToken(user._id, user.email);

    return res.json({
      message: 'Demo login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error('Demo login error:', err);
    return res.status(500).json({ message: 'Failed demo login: ' + err.message });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const user = await db.users.findByEmail(email.trim().toLowerCase());
    if (!user) {
      // Don't leak user existence for security, return positive confirmation
      return res.json({
        message: 'If an account exists with this email, password reset instructions have been generated.',
      });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const resetExpiry = Date.now() + 3600000; // 1 hour

    await db.users.update(user._id, {
      resetToken,
      resetTokenExpiry: resetExpiry,
    });

    return res.json({
      message: 'Password reset code generated successfully.',
      resetToken, // Returned so user can immediately paste or click into reset flow
      demoLink: `/forgot-password?token=${resetToken}`,
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Failed to request password reset: ' + err.message });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const user = await db.users.findByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.users.update(user._id, {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    });

    return res.json({ message: 'Password successfully updated! You can now log in.' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Failed to reset password: ' + err.message });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await db.users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Get me error:', err);
    return res.status(500).json({ message: 'Failed to fetch user profile' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { name, avatarUrl } = req.body;
    const updates: Partial<{ name: string; avatarUrl: string }> = {};

    if (name && name.trim()) updates.name = name.trim();
    if (avatarUrl) updates.avatarUrl = avatarUrl;

    const updated = await db.users.update(req.user.id, updates);
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      message: 'Profile updated successfully',
      user: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to update profile: ' + err.message });
  }
}
