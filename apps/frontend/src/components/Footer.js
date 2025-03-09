import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  IconButton, 
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Twitter as TwitterIcon, 
  Telegram as TelegramIcon, 
  GitHub as GitHubIcon, 
  LinkedIn as LinkedInIcon,
  Discord as DiscordIcon
} from '@mui/icons-material';

const Footer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const currentYear = new Date().getFullYear();
  
  return (
    <Box 
      component="footer" 
      sx={{ 
        bgcolor: 'background.paper',
        pt: 6,
        pb: 3,
        mt: 'auto',
        borderTop: 1,
        borderColor: 'divider'
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <img 
                src="/logo.svg" 
                alt="RealStack Logo" 
                style={{ height: 40, marginRight: 8 }} 
              />
              <Typography variant="h6" color="text.primary">
                RealStack
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              区块链资产通证化平台，连接现实世界与数字经济。
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
                aria-label="Discord" 
                component="a" 
                href="https://discord.gg/realstack" 
                target="_blank"
                size="small"
              >
                <DiscordIcon />
              </IconButton>
              <IconButton 
                aria-label="GitHub" 
                component="a" 
                href="https://github.com/RealStack-xyz" 
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
          
          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="subtitle1" color="text.primary" gutterBottom>
              产品
            </Typography>
            <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/marketplace" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">市场</Typography>
                </Link>
              </Box>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/assets" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">资产</Typography>
                </Link>
              </Box>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/governance" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">治理</Typography>
                </Link>
              </Box>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/tokenomics" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">代币经济</Typography>
                </Link>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="subtitle1" color="text.primary" gutterBottom>
              资源
            </Typography>
            <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/docs" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">文档</Typography>
                </Link>
              </Box>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/whitepaper" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">白皮书</Typography>
                </Link>
              </Box>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/api" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">API</Typography>
                </Link>
              </Box>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/faq" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">常见问题</Typography>
                </Link>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="subtitle1" color="text.primary" gutterBottom>
              公司
            </Typography>
            <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/about" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">关于我们</Typography>
                </Link>
              </Box>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/careers" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">招贤纳士</Typography>
                </Link>
              </Box>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/contact" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">联系我们</Typography>
                </Link>
              </Box>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/blog" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">博客</Typography>
                </Link>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3} md={3}>
            <Typography variant="subtitle1" color="text.primary" gutterBottom>
              法律
            </Typography>
            <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/terms" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">服务条款</Typography>
                </Link>
              </Box>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/privacy" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">隐私政策</Typography>
                </Link>
              </Box>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/compliance" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">合规</Typography>
                </Link>
              </Box>
              <Box component="li" sx={{ py: 0.5 }}>
                <Link to="/security" style={{ textDecoration: 'none', color: 'text.secondary' }}>
                  <Typography variant="body2">安全</Typography>
                </Link>
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'center' : 'flex-start',
          gap: 2
        }}>
          <Typography variant="body2" color="text.secondary">
            © {currentYear} RealStack. 保留所有权利。
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 3,
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'center' : 'flex-end'
          }}>
            <Link to="/terms" style={{ textDecoration: 'none', color: 'text.secondary' }}>
              <Typography variant="body2">服务条款</Typography>
            </Link>
            <Link to="/privacy" style={{ textDecoration: 'none', color: 'text.secondary' }}>
              <Typography variant="body2">隐私政策</Typography>
            </Link>
            <Link to="/cookies" style={{ textDecoration: 'none', color: 'text.secondary' }}>
              <Typography variant="body2">Cookie 政策</Typography>
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer; 