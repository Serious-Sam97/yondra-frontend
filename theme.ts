// theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0B0F14', // page background
      paper:   '#111827', // surfaces like Paper/Card/AppBar (if not colored)
    },
    primary: {
        main: '#2196f3',
    },
    secondary: {
        main: '#57D9A3',
    }
  },
});