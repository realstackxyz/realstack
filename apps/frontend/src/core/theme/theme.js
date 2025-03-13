/**
 * Application Theme Configuration File
 * Unified management of colors, spacing, fonts, and other style properties
 */

export const theme = {
  // Color System
  colors: {
    // Primary Colors
    primary: {
      main: '#4e44ce',
      light: '#7a72e9',
      dark: '#3d35a1',
      contrastText: '#ffffff',
    },
    // Secondary Colors
    secondary: {
      main: '#f0eeff',
      dark: '#e0ddff',
      light: '#f8f7ff',
      contrastText: '#4e44ce',
    },
    // Functional Colors
    success: {
      main: '#52c41a',
      light: '#b7eb8f',
      dark: '#389e0d',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#faad14',
      light: '#ffe58f',
      dark: '#d48806',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f5222d',
      light: '#ff7875',
      dark: '#cf1322',
      contrastText: '#ffffff',
    },
    info: {
      main: '#1890ff',
      light: '#69c0ff',
      dark: '#096dd9',
      contrastText: '#ffffff',
    },
    // Grays
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    // Text
    text: {
      primary: '#333333',
      secondary: '#666666',
      disabled: '#9e9e9e',
      hint: '#9e9e9e',
    },
    // Backgrounds
    background: {
      default: '#ffffff',
      paper: '#ffffff',
      light: '#f8f9fa',
    },
    // Other
    divider: 'rgba(0, 0, 0, 0.12)',
    // Asset Status Colors
    status: {
      tokenized: {
        bg: '#e6f7ff',
        text: '#0070f3'
      },
      verified: {
        bg: '#e6f9e6',
        text: '#52c41a'
      },
      pending: {
        bg: '#fff7e6',
        text: '#faad14'
      },
      rejected: {
        bg: '#fff1f0',
        text: '#f5222d'
      },
      delisted: {
        bg: '#f9f0ff',
        text: '#722ed1'
      }
    }
  },

  // Spacing System
  spacing: {
    xxs: '0.25rem',   // 4px
    xs: '0.5rem',     // 8px
    sm: '0.75rem',    // 12px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    xxl: '3rem',      // 48px
    xxxl: '4rem',     // 64px
  },

  // Border Radius
  borderRadius: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '24px',
    circle: '50%',
  },

  // Shadows
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
    md: '0 4px 6px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
    lg: '0 10px 20px rgba(0,0,0,0.12), 0 3px 6px rgba(0,0,0,0.08)',
    xl: '0 15px 25px rgba(0,0,0,0.12), 0 5px 10px rgba(0,0,0,0.08)',
    inner: 'inset 0 2px 4px rgba(0,0,0,0.1)',
  },

  // Breakpoints
  breakpoints: {
    xs: '0px',
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
    xxl: '1600px',
  },

  // Typography
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontFamilyCode: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontSize: '3.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.8rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.4rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.2rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    subtitle1: {
      fontSize: '1.2rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.5,
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
  },

  // Transitions
  transitions: {
    short: '0.2s',
    medium: '0.3s',
    long: '0.5s',
  },

  // z-index management
  zIndex: {
    mobileStepper: 1000,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  }
};

export default theme; 