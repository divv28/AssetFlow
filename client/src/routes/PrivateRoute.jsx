import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Route protection wrapper for pages that require authentication and optional role authorization.
 */
export const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-odoo-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-odoo-bg p-6">
        <div className="bg-odoo-card p-8 rounded-card shadow-sm border border-odoo-border text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4 font-bold">⚠️</div>
          <h1 className="text-2xl font-bold text-odoo-textPrimary mb-2">Access Denied</h1>
          <p className="text-odoo-textSecondary mb-6">
            You do not have the required permissions to view this module.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-md transition-all-custom font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default PrivateRoute;
