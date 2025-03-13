import React, { lazy, Suspense } from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import LoadingSpinner from '../shared/components/LoadingSpinner';

// 懒加载页面组件
const HomePage = lazy(() => import('../features/home/pages/HomePage'));
const AssetMarketplace = lazy(() => import('../features/marketplace/pages/AssetMarketplace'));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const AssetDetailsPage = lazy(() => import('../features/assets/pages/AssetDetailsPage'));
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'));
const GovernancePage = lazy(() => import('../features/governance/pages/GovernancePage'));
const NotFoundPage = lazy(() => import('../shared/components/NotFoundPage'));

// 受保护的路由组件
const ProtectedRoute = ({ component: Component, isAuthenticated, ...rest }) => (
  <Route
    {...rest}
    render={(props) =>
      isAuthenticated ? (
        <Component {...props} />
      ) : (
        <Redirect
          to={{
            pathname: '/login',
            state: { from: props.location }
          }}
        />
      )
    }
  />
);

// 路由配置
const AppRoutes = ({ isAuthenticated }) => {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Switch>
        {/* 公共路由 */}
        <Route exact path="/" component={HomePage} />
        <Route path="/marketplace" component={AssetMarketplace} />
        <Route path="/assets/:id" component={AssetDetailsPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/governance" component={GovernancePage} />

        {/* 受保护路由 */}
        <ProtectedRoute 
          path="/dashboard" 
          component={DashboardPage} 
          isAuthenticated={isAuthenticated} 
        />

        {/* 404页面 */}
        <Route component={NotFoundPage} />
      </Switch>
    </Suspense>
  );
};

export default AppRoutes; 