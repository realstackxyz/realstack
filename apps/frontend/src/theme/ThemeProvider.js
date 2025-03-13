import React, { useState, useEffect, createContext, useContext } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import PropTypes from 'prop-types';
import defaultTheme from './theme';

/**
 * Theme Context for application-wide theme state
 */
const ThemeContext = createContext({
  theme: defaultTheme,
  isDarkMode: false,
  toggleDarkMode: () => {},
  setTheme: () => {}
});

/**
 * Hook to easily access theme context in components
 * @returns {Object} Theme context object
 */
export const useTheme = () => useContext(ThemeContext);

/**
 * Theme Provider Component
 * 
 * Provides theme context to the entire application.
 * Enables dark mode switching and custom theme setting.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Theme Provider component
 */
export const ThemeProvider = ({ children }) => {
  // Initialize theme state from localStorage or default
  const [theme, setThemeState] = useState(() => {
    const savedTheme = localStorage.getItem('app-theme');
    return savedTheme ? JSON.parse(savedTheme) : defaultTheme;
  });
  
  // Initialize dark mode state from localStorage or default (false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('dark-mode');
    return savedMode === 'true';
  });

  // Save theme settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('app-theme', JSON.stringify(theme));
    localStorage.setItem('dark-mode', isDarkMode.toString());
  }, [theme, isDarkMode]);

  // Toggle dark mode function
  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
    
    // Apply dark mode styles to the theme
    setThemeState(prevTheme => {
      const updatedTheme = { ...prevTheme };
      
      if (!isDarkMode) {
        // Apply dark mode colors
        updatedTheme.colors = {
          ...updatedTheme.colors,
          background: {
            ...updatedTheme.colors.background,
            default: '#121212',
            paper: '#1e1e1e'
          },
          text: {
            ...updatedTheme.colors.text,
            primary: 'rgba(255, 255, 255, 0.87)',
            secondary: 'rgba(255, 255, 255, 0.60)',
            disabled: 'rgba(255, 255, 255, 0.38)',
            hint: 'rgba(255, 255, 255, 0.38)'
          },
          divider: 'rgba(255, 255, 255, 0.12)'
        };
      } else {
        // Revert to light mode colors
        updatedTheme.colors = {
          ...defaultTheme.colors
        };
      }
      
      return updatedTheme;
    });
  };

  // Set custom theme function
  const setTheme = (newTheme) => {
    setThemeState(prevTheme => ({
      ...prevTheme,
      ...newTheme
    }));
  };

  // Combine current theme with dark mode settings
  const currentTheme = {
    ...theme,
    mode: isDarkMode ? 'dark' : 'light'
  };

  // Context value with theme state and functions
  const contextValue = {
    theme: currentTheme,
    isDarkMode,
    toggleDarkMode,
    setTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <StyledThemeProvider theme={currentTheme}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

// PropTypes validation
ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default ThemeProvider; 