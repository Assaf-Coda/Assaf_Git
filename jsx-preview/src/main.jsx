import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import MyApp from './MyApp'
import './index.css'
import octaveFontUrl from './assets/OctaveDisplay-Regular.otf'

const theme = createTheme({
  palette: {
    primary: { main: '#1976D2', light: '#E3F2FD' },
    secondary: { main: '#7B3FA0' },
    success: { main: '#2E7D32', light: '#43A047', dark: '#388E3C' },
    error: { main: '#D32F2F' },
    warning: { main: '#F57C00' },
    info: { main: '#1976D2' },
    grey: { 500: '#9E9E9E' },
    background: {
      default: '#F4F6F8',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1F26',
      secondary: '#5A6470',
      disabled: '#8A95A0',
    },
    divider: '#EEF1F4',
    topbar: '#006B0D',
    tile: '#0F1419',
    gridArea: '#1A1F26',
    hover: 'rgba(15, 20, 25, 0.04)',
    selected: '#E3F2FD',
    border: '#E0E4E8',
    liveGreen: '#4CAF50',
    recordingRed: '#D32F2F',
    aiPurple: '#7B3FA0',
    bookmarkBlue: '#1976D2',
    offline: '#9E9E9E',
  },
  typography: {
    fontFamily: '"OctaveDisplay", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(15, 20, 25, 0.04), 0 1px 3px rgba(15, 20, 25, 0.06)',
    '0 2px 4px rgba(15, 20, 25, 0.06), 0 4px 12px rgba(15, 20, 25, 0.08)',
    ...Array(22).fill('none'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @font-face {
          font-family: 'OctaveDisplay';
          src: url('${octaveFontUrl}') format('opentype');
          font-weight: 400;
          font-style: normal;
        }
      `,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MyApp />
    </ThemeProvider>
  </React.StrictMode>
)