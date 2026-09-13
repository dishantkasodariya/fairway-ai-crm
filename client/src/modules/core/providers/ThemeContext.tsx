import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';

export interface ThemeDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  previewColor: string;
  previewAccent: string;
  shades: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  accentShades: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  chartColors: [string, string, string, string, string];
}

// Themes matching the UI reference matrix
export const THEMES: ThemeDefinition[] = [
  {
    id: 'fairway',
    name: 'Fairway Orange',
    category: 'Brand',
    description: 'Fairway CRM industrial signature orange theme',
    previewColor: '#EB661F',
    previewAccent: '#FB923C',
    shades: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F97316',
      600: '#EB661F',
      700: '#C94F10',
      800: '#A43E0B',
      900: '#7C2E08',
      950: '#431603',
    },
    accentShades: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    chartColors: ['#EB661F', '#F59E0B', '#3B82F6', '#10B981', '#6366F1'],
  },
  {
    id: 'slate',
    name: 'Slate',
    category: 'Neutral',
    description: 'Cool slate gray with high-contrast steel tones',
    previewColor: '#64748B',
    previewAccent: '#94A3B8',
    shades: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
      950: '#020617',
    },
    accentShades: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },
    chartColors: ['#475569', '#64748B', '#94A3B8', '#CBD5E1', '#0EA5E9'],
  },
  {
    id: 'gray',
    name: 'Gray',
    category: 'Neutral',
    description: 'Balanced classic neutral gray palette',
    previewColor: '#6B7280',
    previewAccent: '#9CA3AF',
    shades: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
      950: '#030712',
    },
    accentShades: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    chartColors: ['#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#3B82F6'],
  },
  {
    id: 'zinc',
    name: 'Zinc',
    category: 'Neutral',
    description: 'Industrial zinc charcoal with crisp contrast',
    previewColor: '#71717A',
    previewAccent: '#A1A1AA',
    shades: {
      50: '#FAFAFA',
      100: '#F4F4F5',
      200: '#E4E4E7',
      300: '#D4D4D8',
      400: '#A1A1AA',
      500: '#71717A',
      600: '#52525B',
      700: '#3F3F46',
      800: '#27272A',
      900: '#18181B',
      950: '#09090B',
    },
    accentShades: {
      50: '#FAFAFA',
      100: '#F4F4F5',
      200: '#E4E4E7',
      300: '#D4D4D8',
      400: '#A1A1AA',
      500: '#71717A',
      600: '#52525B',
      700: '#3F3F46',
      800: '#27272A',
      900: '#18181B',
    },
    chartColors: ['#52525B', '#71717A', '#A1A1AA', '#D4D4D8', '#6366F1'],
  },
  {
    id: 'neutral',
    name: 'Neutral',
    category: 'Neutral',
    description: 'Warm obsidian neutral monochrome',
    previewColor: '#737373',
    previewAccent: '#A3A3A3',
    shades: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0A0A0A',
    },
    accentShades: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    chartColors: ['#525252', '#737373', '#A3A3A3', '#D4D4D4', '#10B981'],
  },
  {
    id: 'stone',
    name: 'Stone',
    category: 'Warm Neutral',
    description: 'Earthy warm stone with natural tones',
    previewColor: '#78716C',
    previewAccent: '#A8A29E',
    shades: {
      50: '#FAFAF9',
      100: '#F5F5F4',
      200: '#E7E5E4',
      300: '#D6D3D1',
      400: '#A8A29E',
      500: '#78716C',
      600: '#57534E',
      700: '#44403C',
      800: '#292524',
      900: '#1C1917',
      950: '#0C0A09',
    },
    accentShades: {
      50: '#FAFAF9',
      100: '#F5F5F4',
      200: '#E7E5E4',
      300: '#D6D3D1',
      400: '#A8A29E',
      500: '#78716C',
      600: '#57534E',
      700: '#44403C',
      800: '#292524',
      900: '#1C1917',
    },
    chartColors: ['#57534E', '#78716C', '#A8A29E', '#D6D3D1', '#F59E0B'],
  },
  {
    id: 'red',
    name: 'Red',
    category: 'Vibrant',
    description: 'Dynamic vivid crimson red',
    previewColor: '#EF4444',
    previewAccent: '#F87171',
    shades: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
      950: '#450A0A',
    },
    accentShades: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F97316',
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12',
    },
    chartColors: ['#DC2626', '#EF4444', '#F87171', '#F97316', '#F59E0B'],
  },
  {
    id: 'orange',
    name: 'Orange',
    category: 'Vibrant',
    description: 'Warm energetic sunburst orange',
    previewColor: '#F97316',
    previewAccent: '#FB923C',
    shades: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F97316',
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12',
      950: '#431407',
    },
    accentShades: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    chartColors: ['#EA580C', '#F97316', '#FB923C', '#F59E0B', '#10B981'],
  },
  {
    id: 'amber',
    name: 'Amber',
    category: 'Warm',
    description: 'Luminous industrial amber and gold',
    previewColor: '#F59E0B',
    previewAccent: '#FBBF24',
    shades: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
      950: '#451A03',
    },
    accentShades: {
      50: '#FEFCE8',
      100: '#FEF9C3',
      200: '#FEF08A',
      300: '#FDE047',
      400: '#FACC15',
      500: '#EAB308',
      600: '#CA8A04',
      700: '#A16207',
      800: '#854D0E',
      900: '#713F12',
    },
    chartColors: ['#D97706', '#F59E0B', '#FBBF24', '#10B981', '#0EA5E9'],
  },
  {
    id: 'green',
    name: 'Green',
    category: 'Nature',
    description: 'Lush leaf green with vibrant accents',
    previewColor: '#22C55E',
    previewAccent: '#4ADE80',
    shades: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
      950: '#052E16',
    },
    accentShades: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
      800: '#065F46',
      900: '#064E3B',
    },
    chartColors: ['#16A34A', '#22C55E', '#4ADE80', '#0EA5E9', '#F59E0B'],
  },
  {
    id: 'emerald',
    name: 'Emerald',
    category: 'Brand Default',
    description: 'Classic Fairway deep emerald green',
    previewColor: '#10B981',
    previewAccent: '#34D399',
    shades: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
      800: '#065F46',
      900: '#064E3B',
      950: '#022C22',
    },
    accentShades: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
    },
    chartColors: ['#059669', '#10B981', '#34D399', '#06B6D4', '#F59E0B'],
  },
  {
    id: 'teal',
    name: 'Teal',
    category: 'Fresh',
    description: 'Modern crisp oceanic teal',
    previewColor: '#14B8A6',
    previewAccent: '#2DD4BF',
    shades: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#14B8A6',
      600: '#0D9488',
      700: '#0F766E',
      800: '#115E59',
      900: '#134E4A',
      950: '#042F2E',
    },
    accentShades: {
      50: '#ECFEFF',
      100: '#CFFAFE',
      200: '#A5F3FC',
      300: '#67E8F9',
      400: '#22D3EE',
      500: '#06B6D4',
      600: '#0891B2',
      700: '#0E7490',
      800: '#155E75',
      900: '#164E63',
    },
    chartColors: ['#0D9488', '#14B8A6', '#2DD4BF', '#06B6D4', '#6366F1'],
  },
  {
    id: 'cyan',
    name: 'Cyan',
    category: 'Luminous',
    description: 'High-tech radiant electric cyan',
    previewColor: '#06B6D4',
    previewAccent: '#22D3EE',
    shades: {
      50: '#ECFEFF',
      100: '#CFFAFE',
      200: '#A5F3FC',
      300: '#67E8F9',
      400: '#22D3EE',
      500: '#06B6D4',
      600: '#0891B2',
      700: '#0E7490',
      800: '#155E75',
      900: '#164E63',
      950: '#083344',
    },
    accentShades: {
      50: '#F0F9FF',
      100: '#E0F2FE',
      200: '#BAE6FD',
      300: '#7DD3FC',
      400: '#38BDF8',
      500: '#0EA5E9',
      600: '#0284C7',
      700: '#0369A1',
      800: '#075985',
      900: '#0C4A6E',
    },
    chartColors: ['#0891B2', '#06B6D4', '#22D3EE', '#3B82F6', '#8B5CF6'],
  },
  {
    id: 'sky',
    name: 'Sky',
    category: 'Corporate',
    description: 'Crisp open sky blue with high clarity',
    previewColor: '#0EA5E9',
    previewAccent: '#38BDF8',
    shades: {
      50: '#F0F9FF',
      100: '#E0F2FE',
      200: '#BAE6FD',
      300: '#7DD3FC',
      400: '#38BDF8',
      500: '#0EA5E9',
      600: '#0284C7',
      700: '#0369A1',
      800: '#075985',
      900: '#0C4A6E',
      950: '#082F49',
    },
    accentShades: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    chartColors: ['#0284C7', '#0EA5E9', '#38BDF8', '#6366F1', '#10B981'],
  },
  {
    id: 'blue',
    name: 'Blue',
    category: 'Vibrant Accent',
    description: 'Modern vibrant electric blue matching dashboard UI',
    previewColor: '#0084FF',
    previewAccent: '#38BDF8',
    shades: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#0084FF',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
      950: '#172554',
    },
    accentShades: {
      50: '#F0F9FF',
      100: '#E0F2FE',
      200: '#BAE6FD',
      300: '#7DD3FC',
      400: '#38BDF8',
      500: '#0EA5E9',
      600: '#0284C7',
      700: '#0369A1',
      800: '#075985',
      900: '#0C4A6E',
    },
    chartColors: ['#0084FF', '#3B82F6', '#60A5FA', '#10B981', '#F59E0B'],
  },
  {
    id: 'indigo',
    name: 'Indigo',
    category: 'Enterprise',
    description: 'Deep royal enterprise indigo',
    previewColor: '#6366F1',
    previewAccent: '#818CF8',
    shades: {
      50: '#EEF2FF',
      100: '#E0E7FF',
      200: '#C7D2FE',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#6366F1',
      600: '#4F46E5',
      700: '#4338CA',
      800: '#3730A3',
      900: '#312E81',
      950: '#1E1B4B',
    },
    accentShades: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      200: '#DDD6FE',
      300: '#C4B5FD',
      400: '#A78BFA',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
      800: '#5B21B6',
      900: '#4C1D95',
    },
    chartColors: ['#4F46E5', '#6366F1', '#818CF8', '#0EA5E9', '#10B981'],
  },
  {
    id: 'violet',
    name: 'Violet',
    category: 'Creative',
    description: 'Regal violet with electric luminescence',
    previewColor: '#8B5CF6',
    previewAccent: '#A78BFA',
    shades: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      200: '#DDD6FE',
      300: '#C4B5FD',
      400: '#A78BFA',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
      800: '#5B21B6',
      900: '#4C1D95',
      950: '#2E1065',
    },
    accentShades: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
      700: '#7E22CE',
      800: '#6B21A8',
      900: '#581C87',
    },
    chartColors: ['#7C3AED', '#8B5CF6', '#A78BFA', '#38BDF8', '#10B981'],
  },
  {
    id: 'purple',
    name: 'Purple',
    category: 'Creative',
    description: 'Vivid amethyst purple',
    previewColor: '#A855F7',
    previewAccent: '#C084FC',
    shades: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
      700: '#7E22CE',
      800: '#6B21A8',
      900: '#581C87',
      950: '#3B0764',
    },
    accentShades: {
      50: '#FDF4FF',
      100: '#FAE8FF',
      200: '#F5D0FE',
      300: '#F0ABFC',
      400: '#E879F9',
      500: '#D946EF',
      600: '#C026D3',
      700: '#A21CAF',
      800: '#86198F',
      900: '#701A75',
    },
    chartColors: ['#9333EA', '#A855F7', '#C084FC', '#06B6D4', '#F59E0B'],
  },
  {
    id: 'fuchsia',
    name: 'Fuchsia',
    category: 'Bold',
    description: 'Neon energetic magenta fuchsia',
    previewColor: '#D946EF',
    previewAccent: '#E879F9',
    shades: {
      50: '#FDF4FF',
      100: '#FAE8FF',
      200: '#F5D0FE',
      300: '#F0ABFC',
      400: '#E879F9',
      500: '#D946EF',
      600: '#C026D3',
      700: '#A21CAF',
      800: '#86198F',
      900: '#701A75',
      950: '#4A044E',
    },
    accentShades: {
      50: '#FDF2F8',
      100: '#FCE7F3',
      200: '#FBCFE8',
      300: '#F9A8D4',
      400: '#F472B6',
      500: '#EC4899',
      600: '#DB2777',
      700: '#BE185D',
      800: '#9D174D',
      900: '#831843',
    },
    chartColors: ['#C026D3', '#D946EF', '#E879F9', '#3B82F6', '#10B981'],
  },
  {
    id: 'pink',
    name: 'Pink',
    category: 'Vibrant',
    description: 'Vivid playful high-contrast pink',
    previewColor: '#EC4899',
    previewAccent: '#F472B6',
    shades: {
      50: '#FDF2F8',
      100: '#FCE7F3',
      200: '#FBCFE8',
      300: '#F9A8D4',
      400: '#F472B6',
      500: '#EC4899',
      600: '#DB2777',
      700: '#BE185D',
      800: '#9D174D',
      900: '#831843',
      950: '#500724',
    },
    accentShades: {
      50: '#FFF1F2',
      100: '#FFE4E6',
      200: '#FECDD3',
      300: '#FDA4AF',
      400: '#FB7185',
      500: '#F43F5E',
      600: '#E11D48',
      700: '#BE123C',
      800: '#9F1239',
      900: '#881337',
    },
    chartColors: ['#DB2777', '#EC4899', '#F472B6', '#8B5CF6', '#F59E0B'],
  },
  {
    id: 'rose',
    name: 'Rose',
    category: 'Bold',
    description: 'Rich ruby rose with crimson depth',
    previewColor: '#F43F5E',
    previewAccent: '#FB7185',
    shades: {
      50: '#FFF1F2',
      100: '#FFE4E6',
      200: '#FECDD3',
      300: '#FDA4AF',
      400: '#FB7185',
      500: '#F43F5E',
      600: '#E11D48',
      700: '#BE123C',
      800: '#9F1239',
      900: '#881337',
      950: '#4C0519',
    },
    accentShades: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F97316',
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12',
    },
    chartColors: ['#E11D48', '#F43F5E', '#FB7185', '#F97316', '#3B82F6'],
  },
];

export type ColorMode = 'light' | 'dark' | 'system';
export type NavigationStyle = 'vertical' | 'horizontal';

interface ThemeContextType {
  currentTheme: ThemeDefinition;
  themeId: string;
  setThemeId: (id: string) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  navStyle: NavigationStyle;
  setNavStyle: (style: NavigationStyle) => void;
  radius: number;
  setRadius: (radius: number) => void;
  isDark: boolean;
  toggleColorMode: () => void;
  cycleTheme: () => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  resetTheme: () => void;
  availableThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'fw_crm_active_theme_id';
const MODE_STORAGE_KEY = 'fw_crm_color_mode';
const NAV_STORAGE_KEY = 'fw_crm_nav_style';
const RADIUS_STORAGE_KEY = 'fw_crm_radius';

function hexToRgb(hex: string): string {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized.length === 3 ? sanitized.split('').map(c => c + c).join('') : sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r} ${g} ${b}`;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'fairway';
    } catch {
      return 'fairway';
    }
  });

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY) as ColorMode;
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [navStyle, setNavStyleState] = useState<NavigationStyle>(() => {
    try {
      return (localStorage.getItem(NAV_STORAGE_KEY) as NavigationStyle) || 'vertical';
    } catch {
      return 'vertical';
    }
  });

  const [radius, setRadiusState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(RADIUS_STORAGE_KEY);
      return saved ? parseInt(saved, 10) : 10;
    } catch {
      return 10;
    }
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    setSystemIsDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isDark = colorMode === 'dark' || (colorMode === 'system' && systemIsDark);
  const currentTheme = THEMES.find((t) => t.id === themeId) || THEMES.find((t) => t.id === 'fairway') || THEMES[0];

  const applyThemeToDOM = (theme: ThemeDefinition, darkMode: boolean, currentRadius: number) => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply primary shades
    Object.entries(theme.shades).forEach(([shade, value]) => {
      root.style.setProperty(`--fw-${shade}`, value);
    });

    // Apply accent shades
    Object.entries(theme.accentShades).forEach(([shade, value]) => {
      root.style.setProperty(`--accent-${shade}`, value);
    });

    // Apply chart colors
    theme.chartColors.forEach((color, idx) => {
      root.style.setProperty(`--chart-${idx + 1}`, color);
    });

    const primaryRgb = hexToRgb(theme.shades[600]);
    const primaryHoverRgb = hexToRgb(theme.shades[700]);
    const primarySoftRgb = hexToRgb(darkMode ? theme.shades[950] : theme.shades[100]);
    const accentRgb = hexToRgb(theme.accentShades[500]);
    const accentSoftRgb = hexToRgb(darkMode ? theme.accentShades[900] : theme.accentShades[100]);

    root.style.setProperty('--primary', primaryRgb);
    root.style.setProperty('--primary-hover', primaryHoverRgb);
    root.style.setProperty('--primary-soft', primarySoftRgb);
    root.style.setProperty('--accent', accentRgb);
    root.style.setProperty('--accent-soft', accentSoftRgb);

    const rSm = Math.round(currentRadius * 0.5);
    const rMd = Math.round(currentRadius * 0.85);
    const rLg = currentRadius;
    const rXl = Math.round(currentRadius * 1.25);
    const r2Xl = Math.round(currentRadius * 1.5);
    const r3Xl = Math.round(currentRadius * 2);

    // Apply Radius variable
    root.style.setProperty('--radius', `${currentRadius}px`);
    root.style.setProperty('--radius-sm', `${rSm}px`);
    root.style.setProperty('--radius-md', `${rMd}px`);
    root.style.setProperty('--radius-lg', `${rLg}px`);
    root.style.setProperty('--radius-xl', `${rXl}px`);
    root.style.setProperty('--radius-2xl', `${r2Xl}px`);
    root.style.setProperty('--radius-3xl', `${r3Xl}px`);
    root.style.setProperty('--radius-button', `${currentRadius}px`);
    root.style.setProperty('--radius-input', `${currentRadius}px`);
    root.style.setProperty('--radius-card', `${rXl}px`);
    root.style.setProperty('--radius-panel', `${r2Xl}px`);

    let styleTag = document.getElementById('crm-dynamic-theme-style') as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'crm-dynamic-theme-style';
      document.head.appendChild(styleTag);
    }

    const lightVars = `
      --bg-app: #F8FAFC !important;
      --bg-surface: #FFFFFF !important;
      --bg-surface-muted: #F1F5F9 !important;
      --bg-card: #FFFFFF !important;
      --text-foreground: #000000 !important;
      --text-muted: #475569 !important;
      --text-subtle: #64748B !important;
      --border-color: #E2E8F0 !important;
      --border-strong: #CBD5E1 !important;
      --border-subtle: #F1F5F9 !important;
      --background: 248 250 252 !important;
      --surface: 255 255 255 !important;
      --surface-muted: 241 245 249 !important;
      --foreground: 0 0 0 !important;
      --foreground-muted: 71 85 105 !important;
      --border: 226 232 240 !important;
      --border-strong: 203 213 225 !important;
      --card: 255 255 255 !important;
      --card-foreground: 0 0 0 !important;
      --muted: 241 245 249 !important;
      --muted-foreground: 71 85 105 !important;
      --primary-soft: ${hexToRgb(theme.shades[100])} !important;
      --accent-soft: ${hexToRgb(theme.accentShades[100])} !important;
    `;

    const darkVars = `
      --bg-app: #09090B !important;
      --bg-surface: #121214 !important;
      --bg-surface-muted: #1C1C1F !important;
      --bg-card: #121214 !important;
      --text-foreground: #FFFFFF !important;
      --text-muted: #D4D4D8 !important;
      --text-subtle: #A1A1AA !important;
      --border-color: #27272A !important;
      --border-strong: #3F3F46 !important;
      --border-subtle: #18181B !important;
      --background: 9 9 11 !important;
      --surface: 18 18 20 !important;
      --surface-muted: 28 28 31 !important;
      --foreground: 255 255 255 !important;
      --foreground-muted: 212 212 216 !important;
      --border: 39 39 42 !important;
      --border-strong: 63 63 70 !important;
      --card: 18 18 20 !important;
      --card-foreground: 255 255 255 !important;
      --muted: 28 28 31 !important;
      --muted-foreground: 212 212 216 !important;
      --primary-soft: ${hexToRgb(theme.shades[950])} !important;
      --accent-soft: ${hexToRgb(theme.accentShades[900])} !important;
    `;

    const darkClassOverrides = `
      html.dark, body.dark, .dark {
        background-color: #09090B !important;
        color: #FFFFFF !important;
      }
      html.dark .bg-surface, html.dark .bg-white, html.dark .bg-surface-card {
        background-color: #121214 !important;
      }
      html.dark .bg-background {
        background-color: #09090B !important;
      }
      html.dark .bg-surface-muted, html.dark .bg-slate-50, html.dark .bg-slate-100 {
        background-color: #1C1C1F !important;
      }
      html.dark .bg-surface-muted\\/30, html.dark .bg-surface-muted\\/40, html.dark .bg-surface-muted\\/50, html.dark .bg-surface-muted\\/60, html.dark .bg-surface-muted\\/70 {
        background-color: rgba(28, 28, 31, 0.7) !important;
      }
      html.dark .hover\\:bg-surface-muted:hover,
      html.dark .hover\\:bg-surface-muted\\/40:hover,
      html.dark .hover\\:bg-surface-muted\\/60:hover,
      html.dark .hover\\:bg-slate-50:hover,
      html.dark .hover\\:bg-slate-100:hover,
      html.dark .hover\\:bg-slate-200:hover,
      html.dark .hover\\:bg-gray-50:hover,
      html.dark .hover\\:bg-gray-100:hover {
        background-color: #27272A !important;
      }
      html.dark .hover\\:bg-surface:hover,
      html.dark .hover\\:bg-white:hover {
        background-color: #18181B !important;
      }
      html.dark .border-border, html.dark .border-slate-200, html.dark .border-slate-300 {
        border-color: #27272A !important;
      }
      html.dark .border-border\\/40, html.dark .border-border\\/50, html.dark .border-border\\/60, html.dark .border-border\\/70, html.dark .border-border\\/80 {
        border-color: rgba(63, 63, 70, 0.6) !important;
      }
      html.dark .text-foreground,
      html.dark .text-slate-900, html.dark .text-slate-800, html.dark .text-slate-700,
      html.dark .text-gray-900, html.dark .text-gray-800, html.dark .text-gray-700,
      html.dark .text-zinc-900, html.dark .text-zinc-800, html.dark .text-zinc-700,
      html.dark .text-neutral-900, html.dark .text-neutral-800, html.dark .text-neutral-700,
      html.dark .text-black, html.dark .text-card-foreground {
        color: #FFFFFF !important;
      }
      html.dark .text-foreground-muted,
      html.dark .text-muted-foreground,
      html.dark .text-slate-600, html.dark .text-slate-500, html.dark .text-slate-400,
      html.dark .text-gray-600, html.dark .text-gray-500, html.dark .text-gray-400,
      html.dark .text-zinc-600, html.dark .text-zinc-500, html.dark .text-zinc-400,
      html.dark .text-neutral-600, html.dark .text-neutral-500, html.dark .text-neutral-400 {
        color: #D4D4D8 !important;
      }
      html.dark .text-foreground-subtle,
      html.dark .text-slate-300, html.dark .text-gray-300, html.dark .text-zinc-300 {
        color: #A1A1AA !important;
      }
      html.dark h1, html.dark h2, html.dark h3, html.dark h4, html.dark h5, html.dark h6 {
        color: #FFFFFF !important;
      }
      html.dark strong, html.dark b {
        color: #FFFFFF !important;
      }
      html.dark label {
        color: #F4F4F5 !important;
      }
      html.dark th {
        color: #FFFFFF !important;
        background-color: #1C1C1F !important;
      }
      html.dark td {
        color: #FFFFFF !important;
      }
      html.dark input:not([cmdk-input]):not(.cmdk-input):not([data-transparent]):not(.bg-transparent),
      html.dark select,
      html.dark textarea {
        background-color: #18181B !important;
        color: #FFFFFF !important;
        border-color: #27272A !important;
      }
      [cmdk-input-wrapper] input,
      [cmdk-input],
      .cmdk-input,
      input.cmdk-input {
        background-color: transparent !important;
        background: transparent !important;
        border: none !important;
        border-radius: 0px !important;
        box-shadow: none !important;
        outline: none !important;
      }
      html.dark input::placeholder, html.dark textarea::placeholder {
        color: #71717A !important;
      }
    `;

    const lightClassOverrides = `
      html:not(.dark), body:not(.dark) {
        background-color: #F8FAFC !important;
        color: #000000 !important;
      }
      html:not(.dark) .bg-surface {
        background-color: #FFFFFF !important;
      }
      html:not(.dark) .bg-background {
        background-color: #F8FAFC !important;
      }
      html:not(.dark) .bg-surface-muted {
        background-color: #F1F5F9 !important;
      }
      html:not(.dark) .border-border {
        border-color: #E2E8F0 !important;
      }
      html:not(.dark) .text-foreground,
      html:not(.dark) h1, html:not(.dark) h2, html:not(.dark) h3, html:not(.dark) h4, html:not(.dark) h5, html:not(.dark) h6,
      html:not(.dark) strong, html:not(.dark) b, html:not(.dark) td, html:not(.dark) label {
        color: #000000 !important;
      }
      html:not(.dark) th {
        color: #000000 !important;
        background-color: #F1F5F9 !important;
      }
      html:not(.dark) .text-foreground-muted,
      html:not(.dark) .text-muted-foreground {
        color: #475569 !important;
      }
      html:not(.dark) input:not([cmdk-input]):not(.cmdk-input):not([data-transparent]):not(.bg-transparent),
      html:not(.dark) select,
      html:not(.dark) textarea {
        background-color: #FFFFFF !important;
        color: #000000 !important;
        border-color: #E2E8F0 !important;
      }
      html:not(.dark) input::placeholder, html:not(.dark) textarea::placeholder {
        color: #94A3B8 !important;
      }
    `;

    const cssRules = `
      :root, html, body {
        ${lightVars}
        ${Object.entries(theme.shades).map(([shade, val]) => `--fw-${shade}: ${val} !important;`).join('\n        ')}
        ${Object.entries(theme.accentShades).map(([shade, val]) => `--accent-${shade}: ${val} !important;`).join('\n        ')}
        --primary: ${primaryRgb} !important;
        --primary-hover: ${primaryHoverRgb} !important;
        --accent: ${accentRgb} !important;
        --chart-1: ${theme.chartColors[0]} !important;
        --chart-2: ${theme.chartColors[1]} !important;
        --chart-3: ${theme.chartColors[2]} !important;
        --chart-4: ${theme.chartColors[3]} !important;
        --chart-5: ${theme.chartColors[4]} !important;
        --radius: ${currentRadius}px !important;
        --radius-sm: ${rSm}px !important;
        --radius-md: ${rMd}px !important;
        --radius-lg: ${rLg}px !important;
        --radius-xl: ${rXl}px !important;
        --radius-2xl: ${r2Xl}px !important;
        --radius-3xl: ${r3Xl}px !important;
        --radius-button: ${currentRadius}px !important;
        --radius-input: ${currentRadius}px !important;
        --radius-card: ${rXl}px !important;
        --radius-panel: ${r2Xl}px !important;
      }
      .dark, html.dark {
        ${darkVars}
      }
      ${lightClassOverrides}
      ${darkClassOverrides}
      .bg-fairway-600 { background-color: ${theme.shades[600]} !important; }
      .bg-fairway-700 { background-color: ${theme.shades[700]} !important; }
      .text-fairway-600 { color: ${theme.shades[600]} !important; }
      .text-fairway-700 { color: ${theme.shades[700]} !important; }
      .text-fairway-800 { color: ${theme.shades[800]} !important; }
      .border-fairway-600 { border-color: ${theme.shades[600]} !important; }
      .border-fairway-700 { border-color: ${theme.shades[700]} !important; }
      .focus\\:border-fairway-600:focus { border-color: ${theme.shades[600]} !important; }

      /* Dynamic Corner Radius Overrides */
      .rounded-none { border-radius: 0px !important; }
      .rounded-sm { border-radius: ${rSm}px !important; }
      .rounded { border-radius: ${rMd}px !important; }
      .rounded-md { border-radius: ${rMd}px !important; }
      .rounded-lg { border-radius: ${rLg}px !important; }
      .rounded-xl { border-radius: ${rXl}px !important; }
      .rounded-2xl { border-radius: ${r2Xl}px !important; }
      .rounded-3xl { border-radius: ${r3Xl}px !important; }
      .rounded-button { border-radius: ${currentRadius}px !important; }
      .rounded-input { border-radius: ${currentRadius}px !important; }
      .rounded-card { border-radius: ${rXl}px !important; }
      .rounded-panel { border-radius: ${r2Xl}px !important; }

      button:not(.rounded-full):not([class*="rounded-full"]):not([class*="rounded-none"]),
      .btn,
      input:not([type="checkbox"]):not([type="radio"]):not([cmdk-input]):not(.cmdk-input):not(.rounded-full):not([class*="rounded-full"]):not([class*="rounded-none"]):not(.rounded-none),
      select:not(.rounded-full):not([class*="rounded-full"]):not([class*="rounded-none"]):not(.rounded-none),
      textarea:not(.rounded-full):not([class*="rounded-full"]):not([class*="rounded-none"]):not(.rounded-none) {
        border-radius: ${currentRadius}px !important;
      }
    `;

    if (styleTag.dataset.themeKey !== `${theme.id}_${currentRadius}`) {
      styleTag.textContent = cssRules;
      styleTag.dataset.themeKey = `${theme.id}_${currentRadius}`;
    }
  };

  useLayoutEffect(() => {
    applyThemeToDOM(currentTheme, isDark, radius);
  }, [currentTheme, isDark, radius]);

  const setThemeId = (newId: string) => {
    setThemeIdState(newId);
    try {
      localStorage.setItem(STORAGE_KEY, newId);
    } catch (e) {
      console.error('Failed to save theme in localStorage', e);
    }
  };

  const setColorMode = (newMode: ColorMode) => {
    setColorModeState(newMode);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, newMode);
    } catch (e) {
      console.error('Failed to save color mode in localStorage', e);
    }
  };

  const setNavStyle = (newStyle: NavigationStyle) => {
    setNavStyleState(newStyle);
    try {
      localStorage.setItem(NAV_STORAGE_KEY, newStyle);
    } catch (e) {
      console.error('Failed to save nav style in localStorage', e);
    }
  };

  const setRadius = (newRadius: number) => {
    setRadiusState(newRadius);
    try {
      localStorage.setItem(RADIUS_STORAGE_KEY, String(newRadius));
    } catch (e) {
      console.error('Failed to save radius in localStorage', e);
    }
  };

  const toggleColorMode = () => {
    setColorMode(isDark ? 'light' : 'dark');
  };

  const cycleTheme = () => {
    setThemeIdState((prevThemeId) => {
      const currentIndex = THEMES.findIndex((t) => t.id === prevThemeId);
      const nextIndex = (currentIndex + 1) % THEMES.length;
      const nextTheme = THEMES[nextIndex];
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme.id);
      } catch (e) {
        console.error('Failed to save theme in localStorage', e);
      }
      return nextTheme.id;
    });
  };

  // Global Keyboard Shortcuts: Shift + D (Dark/Light mode) and Shift + C (Cycle Color)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputElement =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox');

      if (isInputElement) return;

      // Shift + D -> Toggle Dark / Light mode
      if (e.shiftKey && (e.key === 'D' || e.key === 'd') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setColorModeState((prev) => {
          const currentIsDark = prev === 'dark' || (prev === 'system' && systemIsDark);
          const nextMode: ColorMode = currentIsDark ? 'light' : 'dark';
          try {
            localStorage.setItem(MODE_STORAGE_KEY, nextMode);
          } catch (err) {
            console.error('Failed to save color mode in localStorage', err);
          }
          return nextMode;
        });
        return;
      }

      // Shift + C -> Cycle color theme
      if (e.shiftKey && (e.key === 'C' || e.key === 'c') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        cycleTheme();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [systemIsDark]);

  const resetTheme = () => {
    setThemeId('fairway');
    setColorMode('dark');
    setNavStyle('vertical');
    setRadius(10);
  };

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeId,
        setThemeId,
        colorMode,
        setColorMode,
        navStyle,
        setNavStyle,
        radius,
        setRadius,
        isDark,
        toggleColorMode,
        cycleTheme,
        isDrawerOpen,
        setIsDrawerOpen,
        openDrawer,
        closeDrawer,
        resetTheme,
        availableThemes: THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
