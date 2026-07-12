import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES, USER_STATUS } from '../constants/roles.js';

class AuthService {
  /**
   * Register a new user in the database.
   * Forces role to EMPLOYEE.
   * @param {Object} userData 
   */
  async registerUser({ name, email, password }) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the user (role defaults to EMPLOYEE in schema, but we enforce it here explicitly too)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: ROLES.EMPLOYEE,
        status: USER_STATUS.ACTIVE,
      },
    });

    // Remove password from returned object
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Login user and generate access/refresh tokens.
   * @param {Object} credentials
   */
  async loginUser({ email, password }) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new ApiError(403, 'Your account is deactivated. Please contact administration.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rotate access and refresh tokens using a valid refresh token.
   * @param {string} token 
   */
  async refreshUserTokens(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new ApiError(401, 'Invalid refresh token: user not found');
      }

      if (user.status !== USER_STATUS.ACTIVE) {
        throw new ApiError(403, 'Your account is deactivated.');
      }

      // Generate new tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }
  }

  /**
   * Helper to generate access tokens.
   */
  generateAccessToken(user) {
    return jwt.sign(
      { id: user.id, uuid: user.uuid, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY }
    );
  }

  /**
   * Helper to generate refresh tokens.
   */
  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY }
    );
  }
}

export default new AuthService();
