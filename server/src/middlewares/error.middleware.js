import { ApiError } from '../utils/apiError.js';

/**
 * Centralized Error handling middleware.
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // If the error is not an instance of ApiError, normalize it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Something went wrong on the server';
    
    // Check for Prisma unique constraints / DB errors
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      error = new ApiError(409, `User with this ${field} already exists`, [err.message]);
    } else {
      error = new ApiError(statusCode, message, err.errors || [], err.stack);
    }
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors,
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  };

  return res.status(error.statusCode).json(response);
};

export { errorHandler };
