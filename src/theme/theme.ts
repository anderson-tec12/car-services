export const theme = {
  colors: {
    primary: '#F5C400',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#B3B3B3',
  },
  spacing: {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radii: {
    md: 12,
    lg: 20,
    full: 999,
  },
} as const;

export type AppTheme = typeof theme;
