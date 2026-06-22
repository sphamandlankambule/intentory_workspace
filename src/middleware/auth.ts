import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth-local.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthUser {
  uid: string;
  email: string;
  dbId: number;
  role: string; // 'admin' | 'manager' | 'staff'
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing session token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
    }

    // Verify user exists in database and get latest details
    const dbUserList = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    if (dbUserList.length === 0) {
      return res.status(401).json({ error: 'Unauthorized: User account no longer exists' });
    }

    const dbUser = dbUserList[0];
    req.user = {
      uid: dbUser.uid,
      email: dbUser.email,
      dbId: dbUser.id,
      role: dbUser.role,
    };
    next();
  } catch (error) {
    console.error('Error in authentication middleware validation:', error);
    return res.status(401).json({ error: 'Unauthorized: Session authentication failed' });
  }
};

// Role Access Guards
export const requireRoles = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role` });
    }
    next();
  };
};

