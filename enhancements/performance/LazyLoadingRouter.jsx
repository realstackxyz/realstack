import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoadingFallback from './LoadingFallback';

/**
 * LazyLoadingRouter implements code splitting and lazy loading
 * to improve initial load times and overall performance.
 * 
 * This component:
 * 1. Uses React.lazy() to split code into separate chunks
 * 2. Only loads components when they're needed
 * 3. Shows a loading indicator during component loading
 * 4. Implements error boundaries for failed chunk loading
 */

// Lazy load all major route components
const Dashboard = lazy(() => import('../pages/Dashboard'));
const AssetMarketplace = lazy(() => import('../pages/AssetMarketplace'));
const AssetDetails = lazy(() => import('../pages/AssetDetails'));
const Profile = lazy(() => import('../pages/Profile'));
const Wallet = lazy(() => import('../pages/Wallet'));
const Settings = lazy(() => import('../pages/Settings'));
const Analytics = lazy(() => import('../pages/Analytics'));

// Error boundary for handling chunk loading failures
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Chunk loading failed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong.</h2>
          <p>The application failed to load. Please try refreshing the page.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load additional chunks based on user permissions
const AdminPanel = lazy(() => 
  import('../pages/admin/AdminPanel').then(module => {
    // Here we could add code to check permissions before loading
    return module;
  })
);

// Prefetch component - use to preload routes the user is likely to visit
export const prefetchComponent = (componentImport) => {
  componentImport();
};

// Main router component with lazy loading
const LazyLoadingRouter = () => {
  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/marketplace" element={<AssetMarketplace />} />
            <Route path="/asset/:id" element={<AssetDetails />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/admin/*" element={<AdminPanel />} />
            {/* Add other routes here */}
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
};

export default LazyLoadingRouter;

// You can add prefetching to navigation components
// Example: When hovering over a navigation item, prefetch that route
/*
  const handleMouseOver = () => {
    prefetchComponent(() => import('../pages/AssetMarketplace'));
  };

  <NavLink to="/marketplace" onMouseOver={handleMouseOver}>
    Marketplace
  </NavLink>
*/ 