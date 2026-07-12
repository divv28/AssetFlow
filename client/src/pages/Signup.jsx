import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(50, 'Name cannot exceed 50 characters'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Please enter a valid email address')
      .toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const passwordVal = watch('password', '');

  // Live password validation checklist helper
  const passwordCriteria = {
    length: passwordVal.length >= 8,
    uppercase: /[A-Z]/.test(passwordVal),
    lowercase: /[a-z]/.test(passwordVal),
    number: /[0-9]/.test(passwordVal),
  };

  const onSubmit = async (data) => {
    setApiError('');
    setSuccessMessage('');
    setIsSubmitting(true);
    try {
      await signup(data.name, data.email, data.password);
      setSuccessMessage('Account registered successfully! Redirecting to login page...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (error) {
      setApiError(error.response?.data?.message || 'Registration failed. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-odoo-bg px-4 py-12">
      <div className="w-full max-w-[440px] bg-odoo-card rounded-card shadow-lg border border-odoo-border overflow-hidden transition-all-custom duration-300 hover:shadow-xl">
        
        {/* Card Header */}
        <div className="border-b border-odoo-border bg-odoo-bg px-6 py-4 text-center">
          <h1 className="text-xl font-bold text-odoo-textPrimary tracking-tight">
            Create Account
          </h1>
        </div>

        <div className="p-8">
          {/* AF Logo */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-full border border-odoo-textSecondary flex items-center justify-center bg-white shadow-sm">
              <span className="text-lg font-semibold tracking-wider text-odoo-textPrimary">AF</span>
            </div>
          </div>

          {/* Odoo Teal Soft Info Banner */}
          <div className="mb-6 p-3.5 bg-odoo-infoBg border border-[#B2EBF2] rounded-lg text-xs text-odoo-infoText leading-relaxed shadow-sm font-medium">
            <strong>Important:</strong> All accounts initialized through signup are auto-assigned the <strong>EMPLOYEE</strong> role. System Admin privileges must be granted by an existing administrator.
          </div>

          {/* Api Messages */}
          {apiError && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2.5 text-sm animate-pulse">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4.5">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-odoo-textPrimary mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                className={`w-full px-3.5 py-2 bg-white border rounded-lg text-sm text-odoo-textPrimary transition-all-custom focus-ring placeholder-gray-400 ${
                  errors.name ? 'border-red-400 focus:ring-red-400' : 'border-odoo-border'
                }`}
                {...register('name')}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-odoo-textPrimary mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                className={`w-full px-3.5 py-2 bg-white border rounded-lg text-sm text-odoo-textPrimary transition-all-custom focus-ring placeholder-gray-400 ${
                  errors.email ? 'border-red-400 focus:ring-red-400' : 'border-odoo-border'
                }`}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-odoo-textPrimary mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full pl-3.5 pr-10 py-2 bg-white border rounded-lg text-sm text-odoo-textPrimary transition-all-custom focus-ring placeholder-gray-400 ${
                    errors.password ? 'border-red-400 focus:ring-red-400' : 'border-odoo-border'
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-odoo-textPrimary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength visual guidelines */}
              <div className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-odoo-textSecondary bg-odoo-bg p-2 rounded-md border border-odoo-border">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${passwordCriteria.length ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>Min 8 characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${passwordCriteria.uppercase ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>One uppercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${passwordCriteria.lowercase ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>One lowercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${passwordCriteria.number ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span>One number</span>
                </div>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-odoo-textPrimary mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                className={`w-full px-3.5 py-2 bg-white border rounded-lg text-sm text-odoo-textPrimary transition-all-custom focus-ring placeholder-gray-400 ${
                  errors.confirmPassword ? 'border-red-400 focus:ring-red-400' : 'border-odoo-border'
                }`}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold transition-all-custom focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Registering...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center">
            <span className="text-xs text-odoo-textSecondary">Already have an account? </span>
            <Link
              to="/login"
              className="text-xs text-primary font-semibold hover:text-primary-hover hover:underline transition-all-custom"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
