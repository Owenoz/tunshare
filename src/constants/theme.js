// TuneShare Dark Theme with Neon Accents

export const COLORS = {
  // Background colors
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#606060',
  
  // Neon accent colors
  neonPurple: '#A855F7',
  neonPink: '#EC4899',
  neonCyan: '#06B6D4',
  neonGreen: '#22C55E',
  neonOrange: '#F97316',
  
  // Primary brand color (purple neon)
  primary: '#A855F7',
  primaryLight: '#C084FC',
  
  // Utility colors
  border: '#333333',
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  // Action colors
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  // Neon glow effect
  neon: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    // Web boxShadow
    boxShadow: `0 0 10px ${COLORS.primary}`,
  },
  // Card shadow
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    // Web boxShadow
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  },
};

export const TYPOGRAPHY = {
  h1: 28,
  h2: 24,
  h3: 20,
  h4: 18,
  body: 16,
  caption: 14,
  small: 12,
};
