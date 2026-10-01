import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tasklist-manager-jwt-secret-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Invalid token format.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    
    // Check if user still exists
    db.users.findById(decoded.id).then(user => {
      if (!user) {
        return res.status(401).json({ message: 'User account not found.' });
      }
      req.user = {
        id: user._id,
        email: user.email,
        name: user.name,
      };
      next();
    }).catch(err => {
      console.error('Error fetching user in authMiddleware:', err);
      return res.status(500).json({ message: 'Internal server error verifying token.' });
    });
  } catch (err) {
    return res.status(401).json({ message: 'Session expired or invalid token. Please log in again.' });
  }
}
