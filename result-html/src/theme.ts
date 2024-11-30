// src/theme.ts

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4f46e5', // Indigo
    },
    secondary: {
      main: '#fbbf24', // Yellow
    },
    success: {
      main: '#10b981', // Green
    },
    error: {
      main: '#ef4444', // Red
    },
    info: {
      main: '#3b82f6', // Blue
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});

export default theme;
