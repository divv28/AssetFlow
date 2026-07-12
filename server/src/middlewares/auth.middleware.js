import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import prisma from '../config/db.js';
import { setContextUser } from './context.middleware.js';

/**
 * Authentication middleware to verify JWT access tokens.
 */
export const authenticateToken = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.accessToken || req.headers?.authorization?.split(' ')[1];

  if (!token) {
    throw new ApiError(401, 'Authentication token missing or invalid');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Fetch active user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        uuid: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
      },
    });

    if (!user) {
      throw new ApiError(401, 'User associated with this token does not exist');
    }

    if (user.status !== 'ACTIVE') {
      throw new ApiError(403, 'Your account is deactivated. Please contact administration.');
    }

    req.user = user;
    setContextUser(user);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token has expired');
    }
    throw new ApiError(401, 'Invalid access token');
  }
});

/**
 * Authorization middleware to check if user has the required roles.
 * @param {...string} roles - The permitted user roles.
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized access');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `Access denied. Requires role: ${roles.join(' or ')}`);
    }

    next();
  };
};
