import React from 'react';
import PropTypes from 'prop-types';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';

/**
 * Loading Spinner Component
 * 
 * Displays a customizable loading spinner with optional text.
 * Can be sized and colored according to props.
 */
const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  showText = true,
  text = '',
  fullScreen = false,
  transparent = false
}) => {
  const { t } = useTranslation();
  
  // Default loading text if none provided
  const displayText = text || t('common.loading');
  
  return (
    <SpinnerContainer fullScreen={fullScreen} transparent={transparent}>
      <Spinner size={size} color={color} />
      {showText && <LoadingText>{displayText}</LoadingText>}
    </SpinnerContainer>
  );
};

// Spinner animation
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Calculate size based on prop
const getSpinnerSize = (size) => {
  switch (size) {
    case 'small':
      return '20px';
    case 'large':
      return '50px';
    case 'medium':
    default:
      return '35px';
  }
};

// Get color from theme based on prop
const getSpinnerColor = (color, theme) => {
  if (color === 'primary') return theme.colors?.primary?.main || '#3f51b5';
  if (color === 'secondary') return theme.colors?.secondary?.main || '#f50057';
  return color; // Use custom color if provided
};

// Styled components
const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  
  ${({ fullScreen }) => fullScreen && `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
  `}
  
  ${({ transparent }) => transparent ? `
    background-color: rgba(255, 255, 255, 0.7);
  ` : `
    background-color: white;
  `}
`;

const Spinner = styled.div`
  border-radius: 50%;
  width: ${({ size }) => getSpinnerSize(size)};
  height: ${({ size }) => getSpinnerSize(size)};
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: ${({ color, theme }) => getSpinnerColor(color, theme)};
  animation: ${spin} 0.8s linear infinite;
`;

const LoadingText = styled.p`
  margin-top: 1rem;
  font-size: 1rem;
  color: #333;
`;

// PropTypes
LoadingSpinner.propTypes = {
  /** Size of the spinner: 'small', 'medium', or 'large' */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  
  /** Color of the spinner: 'primary', 'secondary', or custom color */
  color: PropTypes.string,
  
  /** Whether to show loading text */
  showText: PropTypes.bool,
  
  /** Custom loading text (defaults to 'Loading...') */
  text: PropTypes.string,
  
  /** Whether to display as fullscreen overlay */
  fullScreen: PropTypes.bool,
  
  /** Whether to use transparent background */
  transparent: PropTypes.bool
};

export default LoadingSpinner; 