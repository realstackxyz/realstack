import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import ErrorIcon from '@mui/icons-material/Error';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * Error Message Component
 * 
 * Displays error, warning, info, or success messages
 * with appropriate styling and icons.
 */
const ErrorMessage = ({
  message,
  type = 'error',
  onClose,
  showIcon = true,
  className,
  style
}) => {
  const { t } = useTranslation();
  const displayMessage = message || getDefaultMessage(type, t);
  
  // Get the appropriate icon based on message type
  const getIcon = () => {
    switch (type) {
      case 'info':
        return <InfoIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'success':
        return <CheckCircleIcon />;
      case 'error':
      default:
        return <ErrorIcon />;
    }
  };

  return (
    <MessageContainer 
      type={type} 
      className={className}
      style={style}
    >
      {showIcon && (
        <IconWrapper type={type}>
          {getIcon()}
        </IconWrapper>
      )}
      
      <MessageText>{displayMessage}</MessageText>
      
      {onClose && (
        <CloseButton onClick={onClose}>
          <CloseIcon fontSize="small" />
        </CloseButton>
      )}
    </MessageContainer>
  );
};

/**
 * Get default message based on message type
 * 
 * @param {string} type - Message type ('error', 'warning', 'info', 'success')
 * @param {Function} t - Translation function
 * @returns {string} Default message
 */
const getDefaultMessage = (type, t) => {
  switch (type) {
    case 'info':
      return t('messages.defaultInfo', 'Information');
    case 'warning':
      return t('messages.defaultWarning', 'Warning');
    case 'success':
      return t('messages.defaultSuccess', 'Operation successful');
    case 'error':
    default:
      return t('messages.defaultError', 'An error occurred');
  }
};

// Get color based on message type
const getTypeColor = (type, theme) => {
  switch (type) {
    case 'info':
      return theme.colors?.info?.main || '#2196f3';
    case 'warning':
      return theme.colors?.warning?.main || '#ff9800';
    case 'success':
      return theme.colors?.success?.main || '#4caf50';
    case 'error':
    default:
      return theme.colors?.error?.main || '#f44336';
  }
};

// Get background color based on message type
const getBackgroundColor = (type, theme) => {
  switch (type) {
    case 'info':
      return theme.colors?.info?.light || '#e3f2fd';
    case 'warning':
      return theme.colors?.warning?.light || '#fff3e0';
    case 'success':
      return theme.colors?.success?.light || '#e8f5e9';
    case 'error':
    default:
      return theme.colors?.error?.light || '#ffebee';
  }
};

// Styled components
const MessageContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 4px;
  background-color: ${({ type, theme }) => getBackgroundColor(type, theme)};
  border-left: 4px solid ${({ type, theme }) => getTypeColor(type, theme)};
  margin: 8px 0;
  width: 100%;
  box-sizing: border-box;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-right: 12px;
  color: ${({ type, theme }) => getTypeColor(type, theme)};
`;

const MessageText = styled.div`
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.87);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  margin-left: 8px;
  color: rgba(0, 0, 0, 0.54);
  
  &:hover {
    color: rgba(0, 0, 0, 0.87);
  }
  
  &:focus {
    outline: none;
  }
`;

// PropTypes
ErrorMessage.propTypes = {
  /** Message content to display */
  message: PropTypes.string,
  
  /** Message type */
  type: PropTypes.oneOf(['error', 'warning', 'info', 'success']),
  
  /** Close handler */
  onClose: PropTypes.func,
  
  /** Whether to show the icon */
  showIcon: PropTypes.bool,
  
  /** Additional class name */
  className: PropTypes.string,
  
  /** Inline styles */
  style: PropTypes.object
};

export default ErrorMessage; 