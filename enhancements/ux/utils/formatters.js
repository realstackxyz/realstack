/**
 * Formatting utilities for the RealStack platform
 * 
 * This file contains utility functions for formatting various data types:
 * - Currency values
 * - Blockchain addresses
 * - Dates and times
 * - Numbers with appropriate units
 * - File sizes
 */

/**
 * Format a number as currency
 * 
 * @param {number} value - The value to format
 * @param {string} currency - The currency code (default: USD)
 * @param {string} locale - The locale to use (default: en-US)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, currency = 'USD', locale = 'en-US') => {
  if (value === undefined || value === null) {
    return '—';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format a cryptocurrency amount with proper decimals
 * 
 * @param {number|string} value - The value to format
 * @param {number} decimals - Number of decimal places to show
 * @param {string} symbol - Cryptocurrency symbol to append
 * @returns {string} - Formatted crypto amount
 */
export const formatCryptoAmount = (value, decimals = 4, symbol = 'SOL') => {
  if (value === undefined || value === null) {
    return '—';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Handle very small values with scientific notation
  if (numValue !== 0 && Math.abs(numValue) < Math.pow(10, -decimals)) {
    return `< 0.${'0'.repeat(decimals - 1)}1 ${symbol}`;
  }
  
  return `${numValue.toFixed(decimals)} ${symbol}`;
};

/**
 * Shorten a blockchain address for display
 * 
 * @param {string} address - The address to shorten
 * @param {number} prefixLength - Length of prefix to keep
 * @param {number} suffixLength - Length of suffix to keep
 * @returns {string} - Shortened address
 */
export const shortenAddress = (address, prefixLength = 4, suffixLength = 4) => {
  if (!address || typeof address !== 'string') {
    return '—';
  }
  
  if (address.length <= prefixLength + suffixLength + 3) {
    return address;
  }
  
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
};

/**
 * Format a date in a human-readable way
 * 
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) {
    return '—';
  }
  
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  const defaultOptions = {
    format: 'medium', // 'short', 'medium', 'long', 'full', or custom format
    includeTime: false,
    locale: 'en-US',
  };
  
  const config = { ...defaultOptions, ...options };
  
  // Handle custom format if provided
  if (config.format !== 'short' && config.format !== 'medium' && 
      config.format !== 'long' && config.format !== 'full') {
    // Use date-fns or similar library for custom formats
    // This is a simple placeholder implementation
    return dateObj.toLocaleString();
  }
  
  try {
    // Use built-in date formatting
    const dateOptions = { 
      dateStyle: config.format,
      timeStyle: config.includeTime ? config.format : undefined,
    };
    
    return new Intl.DateTimeFormat(config.locale, dateOptions).format(dateObj);
  } catch (error) {
    // Fallback for older browsers
    return dateObj.toLocaleString(config.locale);
  }
};

/**
 * Format a relative time (e.g., "2 hours ago")
 * 
 * @param {Date|string|number} date - Date to format relative to now
 * @param {string} locale - Locale to use
 * @returns {string} - Relative time string
 */
export const formatRelativeTime = (date, locale = 'en-US') => {
  if (!date) {
    return '—';
  }
  
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  const now = new Date();
  const diffMs = now - dateObj;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // Use Intl.RelativeTimeFormat if available
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    if (diffSecs < 60) {
      return rtf.format(-diffSecs, 'second');
    } else if (diffMins < 60) {
      return rtf.format(-diffMins, 'minute');
    } else if (diffHours < 24) {
      return rtf.format(-diffHours, 'hour');
    } else if (diffDays < 30) {
      return rtf.format(-diffDays, 'day');
    } else {
      // For older dates, use standard date format
      return formatDate(dateObj);
    }
  } catch (error) {
    // Fallback for browsers without RelativeTimeFormat
    if (diffSecs < 60) {
      return `${diffSecs} seconds ago`;
    } else if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else {
      return formatDate(dateObj);
    }
  }
};

/**
 * Format a number with a unit suffix (K, M, B, T)
 * 
 * @param {number} value - Number to format
 * @param {number} maximumFractionDigits - Maximum fraction digits
 * @returns {string} - Formatted number with suffix
 */
export const formatNumberWithSuffix = (value, maximumFractionDigits = 1) => {
  if (value === undefined || value === null) {
    return '—';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '—';
  }
  
  const absValue = Math.abs(numValue);
  
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  });
  
  if (absValue >= 1e12) {
    return `${formatter.format(numValue / 1e12)}T`;
  } else if (absValue >= 1e9) {
    return `${formatter.format(numValue / 1e9)}B`;
  } else if (absValue >= 1e6) {
    return `${formatter.format(numValue / 1e6)}M`;
  } else if (absValue >= 1e3) {
    return `${formatter.format(numValue / 1e3)}K`;
  } else {
    return formatter.format(numValue);
  }
};

/**
 * Format a file size with appropriate units
 * 
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Decimal places to show
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  if (bytes === undefined || bytes === null) return '—';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Format a percentage value
 * 
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Decimal places to show
 * @returns {string} - Formatted percentage
 */
export const formatPercentage = (value, decimals = 2) => {
  if (value === undefined || value === null) {
    return '—';
  }
  
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format a phone number according to national conventions
 * 
 * @param {string} phoneNumber - Phone number to format
 * @param {string} countryCode - ISO country code
 * @returns {string} - Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber, countryCode = 'US') => {
  if (!phoneNumber) {
    return '—';
  }
  
  // Simple US phone formatter, could be expanded for international formats
  if (countryCode === 'US') {
    const cleaned = ('' + phoneNumber).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
  }
  
  // Return as-is for other formats
  return phoneNumber;
};

/**
 * Format a number as a fixed decimal with specified precision
 * 
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted number
 */
export const formatDecimal = (value, decimals = 2) => {
  if (value === undefined || value === null) {
    return '—';
  }
  
  return Number(value).toFixed(decimals);
}; 