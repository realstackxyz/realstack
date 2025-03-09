/**
 * Format a currency value for display
 * @param {number} value - The value to format
 * @param {string} currency - The currency code (default: 'USD')
 * @param {string} locale - The locale to use for formatting (default: 'en-US')
 * @returns {string} The formatted currency value
 */
export const formatCurrency = (value, currency = 'USD', locale = 'en-US') => {
  if (value === undefined || value === null) return '-';
  
  // Determine formatting options based on currency
  let options = {
    style: 'currency',
    currency: currency === 'SOL' ? 'USD' : currency, // Solana doesn't have a currency code
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  };
  
  // Handle Solana formatting specially
  if (currency === 'SOL') {
    return `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value)} SOL`;
  }
  
  // Use Intl formatter for standard currencies
  return new Intl.NumberFormat(locale, options).format(value);
};

/**
 * Format a number for display
 * @param {number} value - The value to format
 * @param {number} digits - Number of decimal digits (default: 2)
 * @param {string} locale - The locale to use for formatting (default: 'en-US')
 * @returns {string} The formatted number
 */
export const formatNumber = (value, digits = 2, locale = 'en-US') => {
  if (value === undefined || value === null) return '-';
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(value);
};

/**
 * Format a percentage for display
 * @param {number} value - The value to format (e.g., 0.15 for 15%)
 * @param {number} digits - Number of decimal digits (default: 2)
 * @param {string} locale - The locale to use for formatting (default: 'en-US')
 * @returns {string} The formatted percentage
 */
export const formatPercent = (value, digits = 2, locale = 'en-US') => {
  if (value === undefined || value === null) return '-';
  
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
};

/**
 * Format a date for display
 * @param {Date|string|number} date - The date to format
 * @param {string} format - The format to use ('short', 'medium', 'long', 'full', or 'relative')
 * @param {string} locale - The locale to use for formatting (default: 'en-US')
 * @returns {string} The formatted date
 */
export const formatDate = (date, format = 'medium', locale = 'en-US') => {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) return '-';
  
  if (format === 'relative') {
    return formatRelativeTime(dateObj);
  }
  
  const options = { 
    dateStyle: format 
  };
  
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
};

/**
 * Format a datetime for display
 * @param {Date|string|number} datetime - The datetime to format
 * @param {string} format - The format to use ('short', 'medium', 'long', 'full')
 * @param {string} locale - The locale to use for formatting (default: 'en-US')
 * @returns {string} The formatted datetime
 */
export const formatDateTime = (datetime, format = 'medium', locale = 'en-US') => {
  if (!datetime) return '-';
  
  const dateObj = typeof datetime === 'string' || typeof datetime === 'number' 
    ? new Date(datetime) 
    : datetime;
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) return '-';
  
  const options = { 
    dateStyle: format,
    timeStyle: format
  };
  
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
};

/**
 * Format a date as a relative time (e.g., "2 hours ago")
 * @param {Date|string|number} date - The date to format
 * @returns {string} The formatted relative time
 */
const formatRelativeTime = (date) => {
  const now = new Date();
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  const diffInSeconds = Math.floor((now - dateObj) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
};

/**
 * Abbreviate a large number for display (e.g., 1,500,000 -> 1.5M)
 * @param {number} value - The value to abbreviate
 * @param {number} digits - Number of decimal digits (default: 1)
 * @param {string} locale - The locale to use for formatting (default: 'en-US')
 * @returns {string} The abbreviated number
 */
export const abbreviateNumber = (value, digits = 1, locale = 'en-US') => {
  if (value === undefined || value === null) return '-';
  
  let result;
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000_000_000) {
    result = `${(value / 1_000_000_000_000).toFixed(digits)}T`;
  } else if (absValue >= 1_000_000_000) {
    result = `${(value / 1_000_000_000).toFixed(digits)}B`;
  } else if (absValue >= 1_000_000) {
    result = `${(value / 1_000_000).toFixed(digits)}M`;
  } else if (absValue >= 1_000) {
    result = `${(value / 1_000).toFixed(digits)}K`;
  } else {
    result = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(value);
  }
  
  return result;
};

/**
 * Truncate a string to a specified length
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @param {string} suffix - Suffix to append when truncated (default: '...')
 * @returns {string} The truncated text
 */
export const truncateText = (text, maxLength, suffix = '...') => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return `${text.substring(0, maxLength)}${suffix}`;
};

/**
 * Format a wallet address for display
 * @param {string} address - The wallet address
 * @param {number} startChars - Number of characters to show at the start (default: 4)
 * @param {number} endChars - Number of characters to show at the end (default: 4)
 * @returns {string} The formatted address
 */
export const formatAddress = (address, startChars = 4, endChars = 4) => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}; 