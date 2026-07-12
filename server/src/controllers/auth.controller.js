import authService from '../services/auth.service.js';
import { signupSchema, loginSchema } from '../validators/auth.validator.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cookie options helper
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax', // Lax works well with React dev server cross-port cookie sending
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days matching refresh token expiry
};

/**
 * Handle user signup.
 */
export const signup = asyncHandler(async (req, res) => {
  // Validate request parameters
  const validationResult = signupSchema.safeParse(req.body);
  if (!validationResult.success) {
    const errorDetails = validationResult.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    throw new ApiError(400, 'Validation Error', errorDetails);
  }

  const { name, email, password } = validationResult.data;
  const user = await authService.registerUser({ name, email, password });

  return res
    .status(201)
    .json(new ApiResponse(201, user, 'User registered successfully as EMPLOYEE'));
});

/**
 * Handle user login.
 */
export const login = asyncHandler(async (req, res) => {
  // Validate request parameters
  const validationResult = loginSchema.safeParse(req.body);
  if (!validationResult.success) {
    const errorDetails = validationResult.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    throw new ApiError(400, 'Validation Error', errorDetails);
  }

  const { email, password } = validationResult.data;
  const { user, accessToken, refreshToken } = await authService.loginUser({ email, password });

  // Set the refresh token in an HTTP-only secure cookie
  res.cookie('refreshToken', refreshToken, cookieOptions);

  return res
    .status(200)
    .json(new ApiResponse(200, { user, accessToken }, 'Login successful'));
});

/**
 * Handle user logout.
 */
export const logout = asyncHandler(async (req, res) => {
  // Clear the cookies
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

/**
 * Get current authenticated user details.
 */
export const getMe = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'Current user profile retrieved successfully'));
});

/**
 * Refresh user tokens.
 */
export const refreshTokens = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  
  if (!token) {
    throw new ApiError(401, 'Refresh token is missing or invalid');
  }

  const { user, accessToken, refreshToken } = await authService.refreshUserTokens(token);

  // Set new refresh token in cookie
  res.cookie('refreshToken', refreshToken, cookieOptions);

  return res
    .status(200)
    .json(new ApiResponse(200, { user, accessToken }, 'Tokens refreshed successfully'));
});
