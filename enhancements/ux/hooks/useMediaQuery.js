import { useState, useEffect } from 'react';

/**
 * useMediaQuery - A custom React hook for responsive design
 * 
 * This hook allows components to respond to media query changes.
 * It returns a boolean indicating whether the current viewport matches the provided query.
 * 
 * @param {string} query - The media query to check (e.g., '(max-width: 768px)')
 * @returns {boolean} - Whether the media query matches
 * 
 * Features:
 * - Server-side rendering compatible (defaults to false)
 * - Updates on viewport changes
 * - Cleans up listeners to prevent memory leaks
 * - Supports all standard media query features
 */

export const useMediaQuery = (query) => {
  // Initialize state with null for SSR compatibility
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') {
      return;
    }
    
    // Create media query list
    const mediaQuery = window.matchMedia(query);
    
    // Set initial state
    setMatches(mediaQuery.matches);
    
    // Define handler function to update state
    const handleChange = (event) => {
      setMatches(event.matches);
    };
    
    // Add event listener with modern API if available
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
    
    // Clean up event listener on unmount
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]); // Re-run effect if query changes
  
  return matches;
};

/**
 * Predefined breakpoints for common screen sizes
 */
export const breakpoints = {
  mobile: '(max-width: 640px)',
  tablet: '(min-width: 641px) and (max-width: 1024px)',
  desktop: '(min-width: 1025px)',
  largeDesktop: '(min-width: 1440px)',
};

/**
 * useResponsive - A hook that returns boolean values for common breakpoints
 * 
 * @returns {Object} - Object with boolean values for each breakpoint
 */
export const useResponsive = () => {
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);
  const isDesktop = useMediaQuery(breakpoints.desktop);
  const isLargeDesktop = useMediaQuery(breakpoints.largeDesktop);
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
  };
};

export default useMediaQuery; 