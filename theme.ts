// theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0B0F14', // page background
      paper:   '#050D16', // surfaces like Paper/Card/AppBar (if not colored)
    },
    primary: {
        main: '#172554',
    },
    secondary: {
        main: '#57D9A3',
    }
  },
});