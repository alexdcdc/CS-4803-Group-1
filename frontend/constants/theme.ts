/**
 * Color and font tokens for the QuickStarter app.
 * Palette is shared with the marketing site at alexdcdc.github.io/quickstarter.
 */

import { Platform } from 'react-native';

const primary = '#6d5ef9';
const secondary = '#22d3ee';
const accent = '#ff4fa3';
const success = '#10d39c';
const warning = '#fbbf24';
const error = '#ef4444';

export const Brand = {
  primary,
  primarySoft: 'rgba(109, 94, 249, 0.12)',
  primaryShadow: 'rgba(109, 94, 249, 0.32)',
  secondary,
  secondarySoft: 'rgba(34, 211, 238, 0.14)',
  accent,
  accentSoft: 'rgba(255, 79, 163, 0.14)',
  success,
  warning,
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  error,
};

export const Colors = {
  light: {
    text: '#0f172a',
    textMuted: '#475569',
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceAlt: '#eef2ff',
    border: 'rgba(15, 23, 42, 0.10)',
    tint: primary,
    icon: '#475569',
    tabIconDefault: '#94a3b8',
    tabIconSelected: primary,
  },
  dark: {
    text: '#f8fafc',
    textMuted: '#94a3b8',
    background: '#0b0b16',
    surface: '#171728',
    surfaceAlt: '#221f3a',
    border: 'rgba(248, 250, 252, 0.10)',
    tint: primary,
    icon: '#cbd5e1',
    tabIconDefault: '#64748b',
    tabIconSelected: primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'DMSans_400Regular',
    sansMedium: 'DMSans_500Medium',
    sansBold: 'DMSans_700Bold',
    display: 'SpaceGrotesk_600SemiBold',
    displayBold: 'SpaceGrotesk_700Bold',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'DMSans_400Regular',
    sansMedium: 'DMSans_500Medium',
    sansBold: 'DMSans_700Bold',
    display: 'SpaceGrotesk_600SemiBold',
    displayBold: 'SpaceGrotesk_700Bold',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    sansMedium: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    sansBold: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    displayBold: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
}) as {
  sans: string;
  sansMedium: string;
  sansBold: string;
  display: string;
  displayBold: string;
  serif: string;
  rounded: string;
  mono: string;
};

export const Radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
};
