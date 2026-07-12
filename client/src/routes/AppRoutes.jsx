import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Dashboard from '../pages/Dashboard';
import OrgSetup from '../pages/OrgSetup';
import AssetsDirectory from '../pages/AssetsDirectory';
import AssetDetails from '../pages/AssetDetails';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />

      {/* Private/Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/organization-setup"
        element={
          <PrivateRoute allowedRoles={['ADMIN']}>
            <OrgSetup />
          </PrivateRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <PrivateRoute>
            <AssetsDirectory />
          </PrivateRoute>
        }
      />
      <Route
        path="/assets/:id"
        element={
          <PrivateRoute>
            <AssetDetails />
          </PrivateRoute>
        }
      />

      {/* Fallback routing */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
