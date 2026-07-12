import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Dashboard from '../pages/Dashboard';
import OrgSetup from '../pages/OrgSetup';
import AssetsDirectory from '../pages/AssetsDirectory';
import AssetDetails from '../pages/AssetDetails';
import AllocationsDashboard from '../pages/AllocationsDashboard';
import TransferRequests from '../pages/TransferRequests';
import ReturnRequests from '../pages/ReturnRequests';
import AllocationHistory from '../pages/AllocationHistory';
import ResourceBooking from '../pages/ResourceBooking';
import MaintenanceBoard from '../pages/MaintenanceBoard';
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
      <Route
        path="/allocations"
        element={
          <PrivateRoute>
            <AllocationsDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/allocations/transfers"
        element={
          <PrivateRoute>
            <TransferRequests />
          </PrivateRoute>
        }
      />
      <Route
        path="/allocations/returns"
        element={
          <PrivateRoute>
            <ReturnRequests />
          </PrivateRoute>
        }
      />
      <Route
        path="/allocations/history"
        element={
          <PrivateRoute>
            <AllocationHistory />
          </PrivateRoute>
        }
      />
      <Route
        path="/resource-booking"
        element={
          <PrivateRoute>
            <ResourceBooking />
          </PrivateRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <PrivateRoute>
            <MaintenanceBoard />
          </PrivateRoute>
        }
      />

      {/* Fallback routing */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
