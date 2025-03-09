import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useWallet } from '@solana/wallet-adapter-react';

const HomePage = () => {
  const { connected } = useWallet();

  return (
    <HomeContainer>
      <HeroSection>
        <HeroContent>
          <HeroTitle>
            Tokenize Real-World Assets on <Highlight>Solana</Highlight>
          </HeroTitle>
          <HeroSubtitle>
            RealStack bridges physical assets to blockchain, creating a more accessible, 
            transparent, and efficient marketplace for tokenized real-world assets.
          </HeroSubtitle>
          <ButtonGroup>
            <PrimaryButton as={Link} to="/marketplace">
              Explore Assets
            </PrimaryButton>
            {connected ? (
              <SecondaryButton as={Link} to="/dashboard">
                My Portfolio
              </SecondaryButton>
            ) : (
              <SecondaryButton as={Link} to="/learn">
                Learn More
              </SecondaryButton>
            )}
          </ButtonGroup>
        </HeroContent>
        <HeroImageContainer>
          <img src="/assets/images/hero-image.svg" alt="Tokenized Assets" />
        </HeroImageContainer>
      </HeroSection>

      <FeaturesSection>
        <SectionTitle>Why Choose RealStack</SectionTitle>
        <FeatureCards>
          <FeatureCard>
            <FeatureIcon>
              <img src="/assets/icons/accessibility.svg" alt="Accessibility" />
            </FeatureIcon>
            <FeatureTitle>Accessibility</FeatureTitle>
            <FeatureDescription>
              Invest in premium real-world assets with minimal entry barriers and fractional ownership.
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>
              <img src="/assets/icons/liquidity.svg" alt="Liquidity" />
            </FeatureIcon>
            <FeatureTitle>Enhanced Liquidity</FeatureTitle>
            <FeatureDescription>
              Easily buy, sell, or trade asset tokens on Solana with low fees and rapid settlement.
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>
              <img src="/assets/icons/transparency.svg" alt="Transparency" />
            </FeatureIcon>
            <FeatureTitle>Transparency</FeatureTitle>
            <FeatureDescription>
              Verified assets with detailed documentation and transparent ownership history.
            </FeatureDescription>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>
              <img src="/assets/icons/governance.svg" alt="Governance" />
            </FeatureIcon>
            <FeatureTitle>Community Governance</FeatureTitle>
            <FeatureDescription>
              Participate in key decisions through the REAL token governance system.
            </FeatureDescription>
          </FeatureCard>
        </FeatureCards>
      </FeaturesSection>

      <AssetCategoriesSection>
        <SectionTitle>Asset Categories</SectionTitle>
        <CategoryCards>
          <CategoryCard to="/marketplace?category=real-estate">
            <CategoryBackground bgImage="/assets/images/real-estate.jpg" />
            <CategoryContent>
              <CategoryTitle>Real Estate</CategoryTitle>
              <CategoryDescription>
                Commercial properties, residential units, and land investments
              </CategoryDescription>
            </CategoryContent>
          </CategoryCard>
          
          <CategoryCard to="/marketplace?category=business">
            <CategoryBackground bgImage="/assets/images/business.jpg" />
            <CategoryContent>
              <CategoryTitle>Business</CategoryTitle>
              <CategoryDescription>
                Small business equity, revenue shares, and franchise opportunities
              </CategoryDescription>
            </CategoryContent>
          </CategoryCard>
          
          <CategoryCard to="/marketplace?category=collectible">
            <CategoryBackground bgImage="/assets/images/collectibles.jpg" />
            <CategoryContent>
              <CategoryTitle>Collectibles</CategoryTitle>
              <CategoryDescription>
                High-value art, rare items, and premium collectibles
              </CategoryDescription>
            </CategoryContent>
          </CategoryCard>
        </CategoryCards>
        <ViewAllButton as={Link} to="/marketplace">
          View All Categories
        </ViewAllButton>
      </AssetCategoriesSection>

      <HowItWorksSection>
        <SectionTitle>How It Works</SectionTitle>
        <StepsContainer>
          <Step>
            <StepNumber>1</StepNumber>
            <StepContent>
              <StepTitle>Asset Verification</StepTitle>
              <StepDescription>
                Each asset undergoes thorough verification, including legal ownership confirmation, 
                professional valuation, and compliance screening.
              </StepDescription>
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>2</StepNumber>
            <StepContent>
              <StepTitle>Tokenization</StepTitle>
              <StepDescription>
                Assets are converted into digital tokens on the Solana blockchain, 
                representing fractional ownership with appropriate legal structuring.
              </StepDescription>
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>3</StepNumber>
            <StepContent>
              <StepTitle>Distribution</StepTitle>
              <StepDescription>
                Tokens are made available to investors through our marketplace, 
                with transparent pricing and accessibility.
              </StepDescription>
            </StepContent>
          </Step>
          
          <Step>
            <StepNumber>4</StepNumber>
            <StepContent>
              <StepTitle>Management & Returns</StepTitle>
              <StepDescription>
                Assets are professionally managed, with returns and income distributed 
                to token holders according to their ownership stake.
              </StepDescription>
            </StepContent>
          </Step>
        </StepsContainer>
      </HowItWorksSection>

      <CtaSection>
        <CtaContent>
          <CtaTitle>Ready to Start Investing in Real-World Assets?</CtaTitle>
          <CtaText>
            Join the RealStack platform today and access a diverse portfolio of tokenized assets.
          </CtaText>
          <CtaButtonGroup>
            <PrimaryButton as={Link} to="/marketplace">
              Explore Assets
            </PrimaryButton>
            <SecondaryButton as={Link} to="/learn">
              Learn More
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