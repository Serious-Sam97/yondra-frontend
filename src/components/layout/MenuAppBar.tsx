'use client'

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import AccountCircle from '@mui/icons-material/AccountCircle';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import YondraIcon from '../icons/yondra.png';
import Image from 'next/image';
import { logout } from '@/lib/auth';
import { useSystem } from '@/contexts/SystemContext';
import { getNotifications, markAllNotificationsRead } from '@/lib/api';

export default function MenuAppBar() {
  const { isLogged, setIsLogged } = useSystem();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const notifRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!isLogged) return;
    const fetchNotifs = () => {
      getNotifications().then(data => setNotifications(Array.isArray(data) ? data : [])).catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [isLogged]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const handleOpenNotifs = async () => {
    setNotifOpen(prev => !prev);
    if (unreadCount > 0) {
      await markAllNotificationsRead().catch(() => {});
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    }
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const goToProfile = () => {
    handleClose();
    window.location.href = '/profile';
  };

  const handleLogout = async () => {
    await logout();
    setIsLogged(false);
    window.location.href = '/login';
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar enableColorOnDark color="primary" position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} className='flex'>
            <Image onClick={goToDashboard} className='rounded cursor-pointer' src={YondraIcon} alt='logo' width={45} height={20}/>
            <p className='self-center pl-3'>Yondra</p>
          </Typography>

          {/* Notification bell */}
          {isLogged && (
            <div className="relative mr-1">
              <button
                ref={notifRef}
                onClick={handleOpenNotifs}
                className="relative w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Notifications"
              >
                <span className="text-lg">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center font-bold" style={{ fontSize: '9px' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)}/>
                  <div className="absolute right-0 top-12 z-50 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-80 max-h-96 overflow-y-auto" style={{ minWidth: '280px' }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Notifications</p>
                      <button onClick={() => setNotifOpen(false)} className="text-gray-600 hover:text-white text-xs cursor-pointer">✕</button>
                    </div>
                    {notifications.length === 0 && (
                      <p className="text-gray-600 text-xs text-center py-8">No notifications yet.</p>
                    )}
                    {notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-gray-800/50 ${!n.read_at ? 'bg-amber-400/5' : ''}`}>
                        <p className="text-gray-300 text-xs">{n.message}</p>
                        <p className="text-gray-600 text-xs mt-0.5">
                          {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

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
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
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
