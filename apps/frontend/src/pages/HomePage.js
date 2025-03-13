import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTranslation } from 'react-i18next';

const HomePage = () => {
  const { connected } = useWallet();
  const { t } = useTranslation();

  return (
    <HomeContainer>
      <HeroSection>
        <HeroContent>
          <HeroTitle>
            {t('home.hero.title')} <Highlight>Solana</Highlight>
          </HeroTitle>
          <HeroSubtitle>
            {t('home.hero.subtitle')}
          </HeroSubtitle>
          <ButtonGroup>
            <PrimaryButton as={Link} to="/marketplace">
              {t('home.buttons.exploreAssets')}
            </PrimaryButton>
            {connected ? (
              <SecondaryButton as={Link} to="/dashboard">
                {t('home.buttons.myPortfolio')}
              </SecondaryButton>
            ) : (
              <SecondaryButton as={Link} to="/learn">
                {t('home.buttons.learnMore')}
              </SecondaryButton>
            )}
          </ButtonGroup>
        </HeroContent>
        <HeroImageContainer>
          <img src="/assets/images/hero-image.svg" alt={t('home.hero.imageAlt')} />
        </HeroImageContainer>
      </HeroSection>

      <FeaturesSection>
        <SectionTitle>{t('home.features.title')}</SectionTitle>
        <FeatureCards>
          <FeatureCard>
            <FeatureIcon>
              <img src="/assets/icons/accessibility.svg" alt={t('home.features.accessibility.title')} />
            </FeatureIcon>
            <FeatureTitle>{t('home.features.accessibility.title')}</FeatureTitle>
            <FeatureDescription>
              {t('home.features.accessibility.description')}
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>
              <img src="/assets/icons/liquidity.svg" alt={t('home.features.enhancedLiquidity.title')} />
            </FeatureIcon>
            <FeatureTitle>{t('home.features.enhancedLiquidity.title')}</FeatureTitle>
            <FeatureDescription>
              {t('home.features.enhancedLiquidity.description')}
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>
              <img src="/assets/icons/transparency.svg" alt={t('home.features.transparency.title')} />
            </FeatureIcon>
            <FeatureTitle>{t('home.features.transparency.title')}</FeatureTitle>
            <FeatureDescription>
              {t('home.features.transparency.description')}
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>
              <img src="/assets/icons/governance.svg" alt={t('home.features.governance.title')} />
            </FeatureIcon>
            <FeatureTitle>{t('home.features.governance.title')}</FeatureTitle>
            <FeatureDescription>
              {t('home.features.governance.description')}
            </FeatureDescription>
          </FeatureCard>
        </FeatureCards>
      </FeaturesSection>

      <AssetCategoriesSection>
        <SectionTitle>{t('home.categories.title')}</SectionTitle>
        <CategoryCards>
          <CategoryCard to="/marketplace?category=real-estate">
            <CategoryBackground bgImage="/assets/images/real-estate.jpg" />
            <CategoryContent>
              <CategoryTitle>{t('market.categories.real_estate')}</CategoryTitle>
              <CategoryDescription>
                {t('home.categories.realEstate.description')}
              </CategoryDescription>
            </CategoryContent>
          </CategoryCard>
          
          <CategoryCard to="/marketplace?category=business">
            <CategoryBackground bgImage="/assets/images/business.jpg" />
            <CategoryContent>
              <CategoryTitle>{t('market.categories.business')}</CategoryTitle>
              <CategoryDescription>
                {t('home.categories.business.description')}
              </CategoryDescription>
            </CategoryContent>
          </CategoryCard>
          
          <CategoryCard to="/marketplace?category=collectible">
            <CategoryBackground bgImage="/assets/images/collectibles.jpg" />
            <CategoryContent>
              <CategoryTitle>{t('market.categories.collectible')}</CategoryTitle>
              <CategoryDescription>
                {t('home.categories.collectible.description')}
              </CategoryDescription>
            </CategoryContent>
          </CategoryCard>
        </CategoryCards>
        <ViewAllButton as={Link} to="/marketplace">
          {t('home.categories.viewAll')}
        </ViewAllButton>
      </AssetCategoriesSection>

      <HowItWorksSection>
        <SectionTitle>{t('home.howItWorks.title')}</SectionTitle>
        <StepsContainer>
          <Step>
            <StepNumber>1</StepNumber>
            <StepContent>
              <StepTitle>{t('home.howItWorks.steps.verification.title')}</StepTitle>
              <StepDescription>
                {t('home.howItWorks.steps.verification.description')}
              </StepDescription>
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>2</StepNumber>
            <StepContent>
              <StepTitle>{t('home.howItWorks.steps.tokenization.title')}</StepTitle>
              <StepDescription>
                {t('home.howItWorks.steps.tokenization.description')}
              </StepDescription>
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>3</StepNumber>
            <StepContent>
              <StepTitle>{t('home.howItWorks.steps.distribution.title')}</StepTitle>
              <StepDescription>
                {t('home.howItWorks.steps.distribution.description')}
              </StepDescription>
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>4</StepNumber>
            <StepContent>
              <StepTitle>{t('home.howItWorks.steps.management.title')}</StepTitle>
              <StepDescription>
                {t('home.howItWorks.steps.management.description')}
              </StepDescription>
            </StepContent>
          </Step>
        </StepsContainer>
      </HowItWorksSection>

      <CtaSection>
        <CtaContent>
          <CtaTitle>{t('home.cta.title')}</CtaTitle>
          <CtaText>
            {t('home.cta.text')}
          </CtaText>
          <CtaButtonGroup>
            <PrimaryButton as={Link} to="/marketplace">
              {t('home.buttons.exploreAssets')}
            </PrimaryButton>
            <SecondaryButton as={Link} to="/learn">
              {t('home.buttons.learnMore')}
            </SecondaryButton>
          </CtaButtonGroup>
        </CtaContent>
      </CtaSection>
    </HomeContainer>
  );
};

// Styled Components
const HomeContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
`;

const HeroSection = styled.section`
  display: flex;
  align-items: center;
  min-height: 600px;
  padding: 4rem 0;
  
  @media (max-width: 992px) {
    flex-direction: column;
    text-align: center;
    padding: 3rem 0;
  }
`;

const HeroContent = styled.div`
  flex: 1;
  padding-right: 2rem;
  
  @media (max-width: 992px) {
    padding-right: 0;
    margin-bottom: 2rem;
  }
`;

const HeroTitle = styled.h1`
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  line-height: 1.2;
  color: #222;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 1.2rem;
  line-height: 1.6;
  color: #555;
  margin-bottom: 2rem;
  max-width: 540px;
  
  @media (max-width: 992px) {
    margin: 0 auto 2rem;
  }
`;

const Highlight = styled.span`
  color: #4e44ce;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  
  @media (max-width: 992px) {
    justify-content: center;
  }
  
  @media (max-width: 576px) {
    flex-direction: column;
  }
`;

const PrimaryButton = styled.button`
  background-color: #4e44ce;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #3d35a1;
  }
`;

const SecondaryButton = styled.button`
  background-color: white;
  color: #4e44ce;
  border: 2px solid #4e44ce;
  border-radius: 8px;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  
  &:hover {
    background-color: #f0eeff;
  }
`;

const HeroImageContainer = styled.div`
  flex: 1;
  max-width: 550px;
  
  img {
    width: 100%;
    height: auto;
  }
`;

const FeaturesSection = styled.section`
  padding: 5rem 0;
  background-color: #f9f9f9;
  border-radius: 16px;
  margin: 2rem 0;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  color: #222;
  text-align: center;
  margin-bottom: 3rem;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const FeatureCards = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  max-width: 1100px;
  margin: 0 auto;
  
  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled.div`
  background-color: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  }
`;

const FeatureIcon = styled.div`
  width: 70px;
  height: 70px;
  margin: 0 auto 1.5rem;
  
  img {
    width: 100%;
    height: 100%;
  }
`;

const FeatureTitle = styled.h3`
  font-size: 1.4rem;
  font-weight: 600;
  color: #222;
  margin-bottom: 1rem;
`;

const FeatureDescription = styled.p`
  font-size: 1rem;
  color: #666;
  line-height: 1.5;
`;

const AssetCategoriesSection = styled.section`
  padding: 5rem 0;
`;

const CategoryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  
  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CategoryCard = styled(Link)`
  position: relative;
  height: 300px;
  border-radius: 16px;
  overflow: hidden;
  text-decoration: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
  }
`;

const CategoryBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url(${props => props.bgImage});
  background-size: cover;
  background-position: center;
  transition: transform 0.5s ease;
  
  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7));
  }
  
  ${CategoryCard}:hover & {
    transform: scale(1.05);
  }
`;

const CategoryContent = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 2rem;
  z-index: 1;
`;

const CategoryTitle = styled.h3`
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
`;

const CategoryDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
`;

const ViewAllButton = styled.button`
  display: block;
  margin: 3rem auto 0;
  background-color: transparent;
  color: #4e44ce;
  border: 2px solid #4e44ce;
  border-radius: 8px;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  
  &:hover {
    background-color: #4e44ce;
    color: white;
  }
`;

const HowItWorksSection = styled.section`
  padding: 5rem 0;
  background-color: #f9f9f9;
  border-radius: 16px;
  margin: 2rem 0;
`;

const StepsContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const Step = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 3rem;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const StepNumber = styled.div`
  background-color: #4e44ce;
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  margin-right: 2rem;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    margin: 0 auto 1rem;
  }
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: #222;
  margin-bottom: 0.5rem;
`;

const StepDescription = styled.p`
  font-size: 1rem;
  color: #666;
  line-height: 1.6;
`;

const CtaSection = styled.section`
  padding: 5rem 0;
  margin: 2rem 0;
  background-color: #4e44ce;
  border-radius: 16px;
  color: white;
  text-align: center;
`;

const CtaContent = styled.div`
  max-width: 700px;
  margin: 0 auto;
`;

const CtaTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const CtaText = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
`;

const CtaButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  
  @media (max-width: 576px) {
    flex-direction: column;
    align-items: center;
  }
`;

export default HomePage; 