import React from 'react';
import { Navigate } from 'react-router-dom';

// Layout components
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Authentication pages
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';

// Public pages
import HomePage from '../features/home/pages/HomePage';
import AboutPage from '../features/about/pages/AboutPage';
import ContactPage from '../features/contact/pages/ContactPage';
import NotFoundPage from '../shared/components/NotFoundPage/NotFoundPage';

// Market pages
import MarketplaceListPage from '../features/marketplace/pages/MarketplaceListPage';
import AssetDetailsPage from '../features/assets/pages/AssetDetailsPage';

// Dashboard pages
import DashboardHomePage from '../features/dashboard/pages/DashboardHomePage';
import UserAssetsPage from '../features/dashboard/pages/UserAssetsPage';
import UserTransactionsPage from '../features/dashboard/pages/UserTransactionsPage';
import UserSettingsPage from '../features/dashboard/pages/UserSettingsPage';

// Governance pages
import GovernancePage from '../features/governance/pages/GovernancePage';
import ProposalDetailsPage from '../features/governance/pages/ProposalDetailsPage';

// Guards
import AuthGuard from '../features/auth/components/AuthGuard';
import GuestGuard from '../features/auth/components/GuestGuard';

/**
 * Application routes configuration
 * 
 * Structure:
 * - path: URL path
 * - element: Component to render
 * - children: Nested routes
 * - guard: Access control component (AuthGuard, GuestGuard)
 */
const routes = [
  // Main public routes with MainLayout
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      
      // Market routes
      { path: 'market', element: <MarketplaceListPage /> },
      { path: 'assets/:assetId', element: <AssetDetailsPage /> },
      
      // Governance routes
      { path: 'governance', element: <GovernancePage /> },
      { path: 'governance/:proposalId', element: <ProposalDetailsPage /> },
      
      // Redirect to 404 for undefined routes
      { path: '404', element: <NotFoundPage /> },
      { path: '*', element: <Navigate to="/404" /> }
    ]
  },
  
  // Authentication routes with AuthLayout
  {
    path: 'auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <GuestGuard><LoginPage /></GuestGuard> },
      { path: 'register', element: <GuestGuard><RegisterPage /></GuestGuard> },
      { path: 'forgot-password', element: <GuestGuard><ForgotPasswordPage /></GuestGuard> },
      { path: 'reset-password', element: <GuestGuard><ResetPasswordPage /></GuestGuard> },
      { path: '*', element: <Navigate to="/404" /> }
    ]
  },
  
  // Dashboard routes (protected) with DashboardLayout
  {
    path: 'dashboard',
    element: <AuthGuard><DashboardLayout /></AuthGuard>,
    children: [
      { path: '', element: <DashboardHomePage /> },
      { path: 'assets', element: <UserAssetsPage /> },
      { path: 'transactions', element: <UserTransactionsPage /> },
      { path: 'settings', element: <UserSettingsPage /> },
      { path: '*', element: <Navigate to="/404" /> }
    ]
  },
  
  // Fallback redirect for any other routes
  {
    path: '*',
    element: <Navigate to="/404" replace />
  }
];

export default routes; 