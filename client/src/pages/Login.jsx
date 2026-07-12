import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    setApiError('');
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (error) {
      setApiError(error.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-odoo-bg px-4 py-12">
      <div className="w-full max-w-[420px] bg-odoo-card rounded-card shadow-lg border border-odoo-border overflow-hidden transition-all-custom duration-300 hover:shadow-xl">
        
        {/* Mockup Header Box */}
        <div className="border-b border-odoo-border bg-odoo-bg px-6 py-4 text-center">
          <h1 className="text-xl font-bold text-odoo-textPrimary tracking-tight">
            AssetFlow – login
          </h1>
        </div>

        <div className="p-8">
          {/* AF Circular Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full border border-odoo-textSecondary flex items-center justify-center bg-white shadow-sm hover:scale-105 transition-all-custom">
              <span className="text-xl font-semibold tracking-wider text-odoo-textPrimary">AF</span>
            </div>
          </div>

          {/* Form Error Banner */}
          {apiError && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2.5 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-odoo-textPrimary mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-odoo-textPrimary transition-all-custom focus-ring placeholder-gray-400 ${
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
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-odoo-textPrimary">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="**********"
                  className={`w-full pl-3.5 pr-10 py-2.5 bg-white border rounded-lg text-sm text-odoo-textPrimary transition-all-custom focus-ring placeholder-gray-400 ${
                    errors.password ? 'border-red-400 focus:ring-red-400' : 'border-odoo-border'
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-odoo-textPrimary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>
              )}
              <div className="flex justify-end mt-1.5">
                <Link
                  to="#"
                  onClick={(e) => { e.preventDefault(); alert('Password reset is not configured for Phase 1.'); }}
                  className="text-xs text-primary hover:text-primary-hover hover:underline transition-all-custom font-medium"
                >
                  Forgot password
                </Link>
              </div>
            </div>

            {/* Primary Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold transition-all-custom focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center justify-between">
            <span className="border-b border-odoo-border w-full"></span>
          </div>

          {/* New Here? Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-odoo-textPrimary">New here?</h2>

            {/* Odoo Teal Soft Info Banner */}
            <div className="p-4 bg-odoo-infoBg border border-[#B2EBF2] rounded-lg text-xs text-odoo-infoText leading-relaxed shadow-sm font-medium">
              Sign up creates an employee account. Admin roles are assigned later by system administrators.
            </div>

            {/* Create Account Navigation Link */}
            <Link
              to="/signup"
              className="block w-full py-2.5 bg-white border border-odoo-border text-center text-odoo-textPrimary hover:bg-primary-light hover:border-primary text-sm font-semibold rounded-lg transition-all-custom focus-ring hover:text-primary"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
