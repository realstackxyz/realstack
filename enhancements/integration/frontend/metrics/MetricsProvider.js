/**
 * RealStack Frontend Metrics Provider
 * 
 * This module provides a comprehensive metrics collection system for React applications,
 * enabling automatic collection of performance metrics and user interactions.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Initialize default configuration
const DEFAULT_CONFIG = {
  metricsEndpoint: '/api/metrics', // Endpoint to send metrics to
  sampleRate: 0.1, // Sample 10% of users for detailed metrics
  sentryDsn: '', // Sentry DSN for error tracking
  environment: process.env.NODE_ENV || 'development',
  enabledMetrics: {
    performance: true,
    navigation: true,
    userInteractions: true,
    errors: true,
    network: true,
    customEvents: true,
  },
  customMetricsPrefix: 'realstack_',
  metricsBatchSize: 10, // Number of metrics to batch before sending
  metricsBatchInterval: 5000, // Milliseconds between batch sends
};

// Create context for metrics
export const MetricsContext = createContext(null);

/**
 * Main metrics provider component
 */
export const MetricsProvider = ({ 
  children, 
  config = {} 
}) => {
  const [metrics, setMetrics] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Merge default config with provided config
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Initialize metrics system
  useEffect(() => {
    if (isInitialized) return;
    
    // Initialize error tracking if enabled
    if (mergedConfig.enabledMetrics.errors && mergedConfig.sentryDsn) {
      Sentry.init({
        dsn: mergedConfig.sentryDsn,
        integrations: [new BrowserTracing()],
        tracesSampleRate: mergedConfig.sampleRate,
        environment: mergedConfig.environment,
      });
    }
    
    // Determine if this user should be sampled
    const shouldSample = Math.random() < mergedConfig.sampleRate;
    
    // Create user session ID
    const sessionId = generateSessionId();
    
    // Initialize performance tracking if enabled
    if (mergedConfig.enabledMetrics.performance && shouldSample) {
      initializePerformanceTracking();
    }
    
    // Initialize navigation tracking if enabled
    if (mergedConfig.enabledMetrics.navigation && shouldSample) {
      initializeNavigationTracking();
    }
    
    // Initialize network tracking if enabled
    if (mergedConfig.enabledMetrics.network && shouldSample) {
      initializeNetworkTracking();
    }
    
    setIsInitialized(true);
    
    // Cleanup function
    return () => {
      // Clean up any event listeners or subscriptions
    };
  }, []);
  
  // Set up batch sending of metrics
  useEffect(() => {
    if (!isInitialized) return;
    
    // Only send if we have metrics and they exceed batch size or on interval
    const intervalId = setInterval(() => {
      if (metrics.length > 0) {
        sendMetricsBatch(metrics);
        setMetrics([]);
      }
    }, mergedConfig.metricsBatchInterval);
    
    return () => clearInterval(intervalId);
  }, [isInitialized, metrics]);
  
  /**
   * Add a new metric to the queue
   */
  const trackMetric = (name, value, labels = {}) => {
    if (!isInitialized) return;
    
    // Add common labels
    const enrichedLabels = {
      ...labels,
      page: window.location.pathname,
      session_id: getSessionId(),
      app_version: process.env.REACT_APP_VERSION || 'unknown',
    };
    
    // Add the metric to the queue
    setMetrics(prevMetrics => [
      ...prevMetrics, 
      {
        name: `${mergedConfig.customMetricsPrefix}${name}`,
        value,
        labels: enrichedLabels,
        timestamp: Date.now(),
      }
    ]);
    
    // If we've exceeded batch size, send immediately
    if (metrics.length >= mergedConfig.metricsBatchSize) {
      sendMetricsBatch(metrics);
      setMetrics([]);
    }
  };
  
  /**
   * Track a user event with optional properties
   */
  const trackEvent = (eventName, properties = {}) => {
    if (!mergedConfig.enabledMetrics.customEvents) return;
    
    trackMetric('event', 1, { 
      event_name: eventName,
      ...properties,
    });
  };
  
  /**
   * Track a page view
   */
  const trackPageView = (page = window.location.pathname) => {
    if (!mergedConfig.enabledMetrics.navigation) return;
    
    trackMetric('page_view', 1, { page });
  };
  
  /**
   * Track a feature usage
   */
  const trackFeatureUsage = (featureName, properties = {}) => {
    if (!mergedConfig.enabledMetrics.customEvents) return;
    
    trackMetric('feature_usage', 1, {
      feature_name: featureName,
      ...properties,
    });
  };
  
  /**
   * Track API call latency
   */
  const trackApiCall = (endpoint, method, statusCode, durationMs) => {
    if (!mergedConfig.enabledMetrics.network) return;
    
    trackMetric('api_call_duration_ms', durationMs, {
      endpoint,
      method,
      status_code: statusCode,
    });
  };
  
  /**
   * Generate a random session ID
   */
  const generateSessionId = () => {
    const sessionId = localStorage.getItem('realstack_session_id');
    if (sessionId) return sessionId;
    
    const newSessionId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('realstack_session_id', newSessionId);
    return newSessionId;
  };
  
  /**
   * Get the current session ID
   */
  const getSessionId = () => {
    return localStorage.getItem('realstack_session_id') || generateSessionId();
  };
  
  /**
   * Initialize performance tracking
   */
  const initializePerformanceTracking = () => {
    // Track initial page load performance
    window.addEventListener('load', () => {
      if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        
        // Calculate key performance metrics
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        const dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
        const tcpTime = timing.connectEnd - timing.connectStart;
        const ttfb = timing.responseStart - timing.requestStart;
        const domReady = timing.domComplete - timing.domLoading;
        
        // Track each metric
        trackMetric('page_load_time_ms', pageLoadTime);
        trackMetric('dns_time_ms', dnsTime);
        trackMetric('tcp_time_ms', tcpTime);
        trackMetric('ttfb_ms', ttfb);
        trackMetric('dom_ready_time_ms', domReady);
      }
    });
    
    // Track first contentful paint
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          trackMetric('first_contentful_paint_ms', entry.startTime);
        }
      }
    });
    observer.observe({ type: 'paint', buffered: true });
  };
  
  /**
   * Initialize navigation tracking
   */
  const initializeNavigationTracking = () => {
    // Track initial page view
    trackPageView();
    
    // Track history changes for SPA navigation
    const originalPushState = window.history.pushState;
    window.history.pushState = function() {
      originalPushState.apply(this, arguments);
      trackPageView();
    };
    
    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      trackPageView();
    };
    
    window.addEventListener('popstate', () => {
      trackPageView();
    });
  };
  
  /**
   * Initialize network tracking
   */
  const initializeNetworkTracking = () => {
    // Intercept fetch calls
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(input, init);
        const endTime = performance.now();
        
        // Get the URL path
        let url = typeof input === 'string' ? input : input.url;
        // Extract path from URL
        const urlObj = new URL(url, window.location.origin);
        const path = urlObj.pathname;
        
        // Track the fetch call
        trackApiCall(
          path,
          init?.method || 'GET',
          response.status,
          endTime - startTime
        );
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        trackApiCall(
          typeof input === 'string' ? input : input.url,
          init?.method || 'GET',
          0, // 0 status means network error
          endTime - startTime
        );
        throw error;
      }
    };
    
    // Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      this._metricUrl = url;
      this._metricMethod = method;
      this._metricStartTime = performance.now();
      originalOpen.apply(this, arguments);
    };
    
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
      this.addEventListener('load', () => {
        const endTime = performance.now();
        
        // Extract path from URL
        const urlObj = new URL(this._metricUrl, window.location.origin);
        const path = urlObj.pathname;
        
        trackApiCall(
          path,
          this._metricMethod,
          this.status,
          endTime - this._metricStartTime
        );
      });
      
      this.addEventListener('error', () => {
        const endTime = performance.now();
        trackApiCall(
          this._metricUrl,
          this._metricMethod,
          0, // 0 status means network error
          endTime - this._metricStartTime
        );
      });
      
      originalSend.apply(this, arguments);
    };
  };
  
  /**
   * Send a batch of metrics to the server
   */
  const sendMetricsBatch = async (metricsBatch) => {
    if (!metricsBatch.length) return;
    
    try {
      const response = await fetch(mergedConfig.metricsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: metricsBatch,
        }),
        // Use keepalive to ensure the request completes even if the page is unloading
        keepalive: true,
      });
      
      if (!response.ok) {
        console.error('Failed to send metrics:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending metrics:', error);
    }
  };
  
  // Create context value
  const contextValue = {
    trackMetric,
    trackEvent,
    trackPageView,
    trackFeatureUsage,
    trackApiCall,
  };
  
  return (
    <MetricsContext.Provider value={contextValue}>
      {children}
    </MetricsContext.Provider>
  );
};

/**
 * Hook to use metrics in components
 */
export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
};

/**
 * Hook for page-specific metrics
 */
export const usePageMetrics = () => {
  const { trackMetric, trackEvent } = useMetrics();
  const [pageLoadTime, setPageLoadTime] = useState(null);
  
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const timeOnPage = endTime - startTime;
      setPageLoadTime(timeOnPage);
      trackMetric('time_on_page_ms', timeOnPage, {
        page: window.location.pathname,
      });
    };
  }, []);
  
  return { 
    trackEvent,
    pageLoadTime,
  };
};

/**
 * Hook for error tracking
 */
export const useErrorTracking = () => {
  const { trackMetric } = useMetrics();
  
  useEffect(() => {
    const handleError = (error, errorInfo) => {
      // Track error in our metrics system
      trackMetric('javascript_error', 1, {
        error_message: error.message,
        error_stack: error.stack,
        component: errorInfo?.componentStack,
      });
      
      // Also send to Sentry if available
      if (Sentry && Sentry.captureException) {
        Sentry.captureException(error, {
          extra: errorInfo,
        });
      }
    };
    
    // Create error boundary
    class ErrorBoundary extends React.Component {
      componentDidCatch(error, errorInfo) {
        handleError(error, errorInfo);
      }
      
      render() {
        return this.props.children;
      }
    }
    
    return { ErrorBoundary, handleError };
  }, []);
};

/**
 * Custom hook for monitoring API calls
 */
export const useApiMetrics = () => {
  const { trackApiCall } = useMetrics();
  
  const monitoredFetch = async (url, options = {}) => {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, options);
      const endTime = performance.now();
      
      // Extract path from URL
      const urlObj = new URL(url, window.location.origin);
      const path = urlObj.pathname;
      
      trackApiCall(
        path,
        options.method || 'GET',
        response.status,
        endTime - startTime
      );
      
      return response;
    } catch (error) {
      const endTime = performance.now();
      
      trackApiCall(
        url,
        options.method || 'GET',
        0,
        endTime - startTime
      );
      
      throw error;
    }
  };
  
  return { monitoredFetch };
};

export default MetricsProvider; 