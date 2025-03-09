import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Menu, 
  MenuItem, 
  Box, 
  useMediaQuery, 
  useTheme, 
  Drawer, 
  List, 
  ListItem, 
  ListItemText, 
  Avatar 
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  AccountCircle, 
  KeyboardArrowDown, 
  Close 
} from '@mui/icons-material';

const Header = ({ isAuthenticated, userProfile, onLogout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [marketAnchorEl, setMarketAnchorEl] = useState(null);
  
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleMarketMenuOpen = (event) => {
    setMarketAnchorEl(event.currentTarget);
  };
  
  const handleMarketMenuClose = () => {
    setMarketAnchorEl(null);
  };
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
        <IconButton onClick={handleDrawerToggle}>
          <Close />
        </IconButton>
      </Box>
      <List>
        <ListItem button component={Link} to="/" onClick={handleDrawerToggle}>
          <ListItemText primary="首页" />
        </ListItem>
        <ListItem button component={Link} to="/marketplace" onClick={handleDrawerToggle}>
          <ListItemText primary="市场" />
        </ListItem>
        <ListItem button component={Link} to="/assets" onClick={handleDrawerToggle}>
          <ListItemText primary="资产" />
        </ListItem>
        <ListItem button component={Link} to="/governance" onClick={handleDrawerToggle}>
          <ListItemText primary="治理" />
        </ListItem>
        {isAuthenticated ? (
          <>
            <ListItem button component={Link} to="/dashboard" onClick={handleDrawerToggle}>
              <ListItemText primary="仪表盘" />
            </ListItem>
            <ListItem button onClick={() => { onLogout(); handleDrawerToggle(); }}>
              <ListItemText primary="登出" />
            </ListItem>
          </>
        ) : (
          <>
            <ListItem button component={Link} to="/login" onClick={handleDrawerToggle}>
              <ListItemText primary="登录" />
            </ListItem>
            <ListItem button component={Link} to="/register" onClick={handleDrawerToggle}>
              <ListItemText primary="注册" />
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        
        <Typography 
          variant="h6" 
          component={Link} 
          to="/" 
          sx={{ 
            flexGrow: 0, 
            textDecoration: 'none', 
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            mr: 3
          }}
        >
          <img 
            src="/logo.svg" 
            alt="RealStack Logo" 
            style={{ height: 32, marginRight: 8 }} 
          />
          RealStack
        </Typography>
        
        {!isMobile && (
          <Box sx={{ flexGrow: 1, display: 'flex' }}>
            <Button 
              color="inherit" 
              component={Link} 
              to="/"
              sx={{ mx: 1 }}
            >
              首页
            </Button>
            
            <Button 
              color="inherit"
              endIcon={<KeyboardArrowDown />}
              onClick={handleMarketMenuOpen}
              sx={{ mx: 1 }}
            >
              市场
            </Button>
            <Menu
              anchorEl={marketAnchorEl}
              open={Boolean(marketAnchorEl)}
              onClose={handleMarketMenuClose}
            >
              <MenuItem 
                component={Link} 
                to="/marketplace/real-estate" 
                onClick={handleMarketMenuClose}
              >
                房地产
              </MenuItem>
              <MenuItem 
                component={Link} 
                to="/marketplace/art" 
                onClick={handleMarketMenuClose}
              >
                艺术品
              </MenuItem>
              <MenuItem 
                component={Link} 
                to="/marketplace/collectibles" 
                onClick={handleMarketMenuClose}
              >
                收藏品
              </MenuItem>
            </Menu>
            
            <Button 
              color="inherit" 
              component={Link} 
              to="/assets"
              sx={{ mx: 1 }}
            >
              资产
            </Button>
            
            <Button 
              color="inherit" 
              component={Link} 
              to="/governance"
              sx={{ mx: 1 }}
            >
              治理
            </Button>
          </Box>
        )}
        
        {!isMobile && (
          <Box sx={{ display: 'flex' }}>
            {isAuthenticated ? (
              <>
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/dashboard"
                  sx={{ mx: 1 }}
                >
                  仪表盘
                </Button>
                <IconButton
                  edge="end"
                  aria-label="account of current user"
                  aria-haspopup="true"
                  onClick={handleProfileMenuOpen}
                  color="inherit"
                >
                  {userProfile?.avatar ? (
                    <Avatar 
                      src={userProfile.avatar} 
                      alt={userProfile.name} 
                      sx={{ width: 32, height: 32 }} 
                    />
                  ) : (
                    <AccountCircle />
                  )}
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem 
                    component={Link} 
                    to="/profile" 
                    onClick={handleMenuClose}
                  >
                    个人资料
                  </MenuItem>
                  <MenuItem 
                    component={Link} 
                    to="/settings" 
                    onClick={handleMenuClose}
                  >
                    设置
                  </MenuItem>
                  <MenuItem onClick={() => { onLogout(); handleMenuClose(); }}>
                    登出
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/login"
                  sx={{ mx: 1 }}
                >
                  登录
                </Button>
                <Button 
                  variant="contained" 
                  color="primary" 
                  component={Link} 
                  to="/register"
                  sx={{ mx: 1 }}
                >
                  注册
                </Button>
              </>
            )}
          </Box>
        )}
      </Toolbar>
      
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
};

export default Header; 