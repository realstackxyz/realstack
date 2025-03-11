import React, { useState, useEffect } from 'react';

/**
 * LoadingFallback provides a visually appealing loading experience
 * when lazy-loaded components are being fetched.
 * 
 * Features:
 * - Animated loading indicator
 * - Progressive messaging based on loading time
 * - Accessible loading state
 */

const LoadingFallback = () => {
  const [loadingTime, setLoadingTime] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingTime(prevTime => prevTime + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Progressive messages based on how long loading is taking
  const getLoadingMessage = () => {
    if (loadingTime < 3) {
      return "Loading...";
    } else if (loadingTime < 6) {
      return "Still working on it...";
    } else if (loadingTime < 10) {
      return "This is taking longer than expected...";
    } else {
      return "Please check your connection and try refreshing the page.";
    }
  };

  return (
    <div 
      className="loading-container"
      role="alert"
      aria-busy="true"
      aria-label="Content is loading"
    >
      <div className="spinner">
        <div className="spinner-inner"></div>
      </div>
      <p className="loading-message">{getLoadingMessage()}</p>
      
      {/* Display refresh button after 15 seconds */}
      {loadingTime > 15 && (
        <button 
          onClick={() => window.location.reload()}
          className="refresh-button"
        >
          Refresh Page
        </button>
      )}
      
      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100%;
          background-color: rgba(255, 255, 255, 0.9);
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1000;
        }
        
        .spinner {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          position: relative;
          margin-bottom: 20px;
        }
        
        .spinner-inner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top-color: #3498db;
          animation: spin 1s ease-in-out infinite;
          position: absolute;
          top: 0;
          left: 0;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        .loading-message {
          font-size: 16px;
          color: #333;
          text-align: center;
          max-width: 80%;
          margin: 10px 0;
        }
        
        .refresh-button {
          margin-top: 20px;
          padding: 10px 20px;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }
        
        .refresh-button:hover {
          background-color: #2980b9;
        }
      `}</style>
    </div>
  );
};

export default LoadingFallback; 