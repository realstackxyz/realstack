import React from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Link, 
  IconButton,
  useMediaQuery 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { 
  Twitter as TwitterIcon, 
  GitHub as GitHubIcon, 
  LinkedIn as LinkedInIcon, 
  Telegram as TelegramIcon
} from '@mui/icons-material';
import Logo from './Logo';

// Get current year for copyright notice
const currentYear = new Date().getFullYear();

const Footer = () => {
  const { t } = useTranslation();
  
  return (
    <Box 
      component="footer" 
      sx={{ 
        bgcolor: 'background.paper',
        py: 6, 
        borderTop: 1, 
        borderColor: 'divider'
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Company Information */}
          <Grid item xs={12} md={4}>
            <Box mb={2}>
              <Logo 
                sx={{ height: 40 }}
                alt="RealStack Logo"
              />
              <Typography variant="h6" color="text.primary" gutterBottom sx={{ display: 'inline-block', ml: 1 }}>
                RealStack
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              {t('footer.tagline')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton 
                aria-label="Twitter" 
                component="a" 
                href="https://x.com/RealStack_xyz" 
                target="_blank"
                size="small"
              >
                <TwitterIcon />
              </IconButton>
              <IconButton 
                aria-label="GitHub" 
                component="a" 
                href="https://github.com/realstackxyz/realstack" 
                target="_blank"
                size="small"
              >
                <GitHubIcon />
              </IconButton>
              <IconButton 
                aria-label="Telegram" 
                component="a" 
                href="https://t.me/realstack" 
                target="_blank"
                size="small"
              >
                <TelegramIcon />
              </IconButton>
              <IconButton 
                aria-label="LinkedIn" 
                component="a" 
                href="https://linkedin.com/company/realstack" 
                target="_blank"
                size="small"
              >
                <LinkedInIcon />
              </IconButton>
            </Box>
          </Grid>

          {/* Resources Links */}
          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              {t('footer.resources')}
            </Typography>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li>
                <Link href="/docs" color="text.secondary" underline="hover">
                  {t('footer.documentation')}
                </Link>
              </li>
              <li>
                <Link href="/faq" color="text.secondary" underline="hover">
                  {t('footer.faq')}
                </Link>
              </li>
              <li>
                <Link href="/api" color="text.secondary" underline="hover">
                  {t('footer.api')}
                </Link>
              </li>
              <li>
                <Link href="/tutorials" color="text.secondary" underline="hover">
                  {t('footer.tutorials')}
                </Link>
              </li>
            </ul>
          </Grid>

          {/* Company Links */}
          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              {t('footer.company')}
            </Typography>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li>
                <Link href="/about" color="text.secondary" underline="hover">
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link href="/team" color="text.secondary" underline="hover">
                  {t('footer.team')}
                </Link>
              </li>
              <li>
                <Link href="/careers" color="text.secondary" underline="hover">
                  {t('footer.careers')}
                </Link>
              </li>
              <li>
                <Link href="/press" color="text.secondary" underline="hover">
                  {t('footer.press')}
                </Link>
              </li>
            </ul>
          </Grid>

          {/* Legal Links */}
          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              {t('footer.legal')}
            </Typography>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li>
                <Link href="/terms" color="text.secondary" underline="hover">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" color="text.secondary" underline="hover">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/cookies" color="text.secondary" underline="hover">
                  {t('footer.cookies')}
                </Link>
              </li>
              <li>
                <Link href="/licenses" color="text.secondary" underline="hover">
                  {t('footer.licenses')}
                </Link>
              </li>
            </ul>
          </Grid>

          {/* Contact Info */}
          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              {t('footer.contact')}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              info@realstack.xyz
            </Typography>
          </Grid>

          {/* Footer Copyright */}
          <Grid item xs={12}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              align="center"
              sx={{ 
                borderTop: 1, 
                borderColor: 'divider', 
                pt: 3, 
                mt: 3 
              }}
            >
              © {currentYear} RealStack. {t('footer.copyright')}
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Footer; 