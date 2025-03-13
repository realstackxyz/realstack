import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

/**
 * 404 Page Component
 */
const NotFoundPage = () => {
  const { t } = useTranslation();
  
  return (
    <Container>
      <Content>
        <ErrorCode>404</ErrorCode>
        <Title>{t('error.notFound.title')}</Title>
        <Description>{t('error.notFound.description')}</Description>
        <ButtonGroup>
          <HomeButton as={Link} to="/">
            {t('error.notFound.backHome')}
          </HomeButton>
          <ContactButton as="a" href="mailto:support@realstack.com">
            {t('error.notFound.contactSupport')}
          </ContactButton>
        </ButtonGroup>
      </Content>
      <ImageContainer>
        <img 
          src="/assets/images/404-illustration.svg" 
          alt={t('error.notFound.imageAlt')} 
        />
      </ImageContainer>
    </Container>
  );
};

// Styled components
const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
  padding: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column-reverse;
    text-align: center;
  }
`;

const Content = styled.div`
  flex: 1;
  max-width: 500px;
  margin-right: 2rem;
  
  @media (max-width: 768px) {
    margin-right: 0;
    margin-top: 2rem;
  }
`;

const ErrorCode = styled.h1`
  font-size: 6rem;
  font-weight: 700;
  color: #4e44ce;
  margin: 0;
  line-height: 1;
`;

const Title = styled.h2`
  font-size: 2rem;
  margin: 1rem 0;
  color: #333;
`;

const Description = styled.p`
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  
  @media (max-width: 576px) {
    flex-direction: column;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
`;

const HomeButton = styled(Button)`
  background-color: #4e44ce;
  color: white;
  border: none;
  
  &:hover {
    background-color: #3d35a1;
  }
`;

const ContactButton = styled(Button)`
  background-color: white;
  color: #4e44ce;
  border: 1px solid #4e44ce;
  
  &:hover {
    background-color: #f0eeff;
  }
`;

const ImageContainer = styled.div`
  flex: 1;
  max-width: 400px;
  
  img {
    width: 100%;
    height: auto;
  }
`;

export default NotFoundPage; 