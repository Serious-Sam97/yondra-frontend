'use client'

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import YondraIcon from '../icons/yondra.png';
import Image from 'next/image';
import { logout } from '@/lib/auth';
import { useSystem } from '@/contexts/SystemContext';

export default function MenuAppBar() {
  const { isLogged, setIsLogged } = useSystem();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  }

  const goToProfile = () => {
    handleClose();
    window.location.href = '/profile';
  }

  const handleLogout = async () => {
    await logout();
    setIsLogged(false);
    window.location.href = '/login';
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar enableColorOnDark color="primary" position="static">
        <Toolbar>
          {/* <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton> */}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} className='flex'>
              <Image onClick={() => goToDashboard()} className='rounded cursor-pointer' src={YondraIcon} alt='logo' width={45} height={20}/>
              <p className='self-center pl-3'>Yondra</p>
            
          </Typography>
          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              {isLogged ? [
                <MenuItem key="profile" onClick={goToProfile}>Profile</MenuItem>,
                <MenuItem key="logout" onClick={handleLogout}>Logout</MenuItem>,
              ] : [
                <MenuItem key="login" onClick={() => { handleClose(); window.location.href = '/login'; }}>Login</MenuItem>,
                <MenuItem key="register" onClick={() => { handleClose(); window.location.href = '/register'; }}>Register</MenuItem>,
              ]}
            </Menu>
          </div>
        </Toolbar>
      </AppBar>
    </Box>
  );
}