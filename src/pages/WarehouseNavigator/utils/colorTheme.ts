// Color Theme for Warehouse Navigator
// Industrial Pallet Rack Color Palette

import { ColorTheme } from '../types';

// Industrial rack colors
export const RACK_COLORS = {
  uprightBlue: '#4A7C8C',      // Blue/teal for vertical uprights
  uprightBlueDark: '#3A6070',  // Darker blue for dark mode
  beamOrange: '#D35F28',       // Orange for horizontal beams
  beamOrangeDark: '#B54D1C',   // Darker orange for dark mode
  wireDecking: '#C0C0C0',      // Silver/gray for wire mesh
  wireDeckingDark: '#808080',  // Darker gray for dark mode
  bracingGray: '#6A7A7C',      // Gray for diagonal bracing
  bracingGrayDark: '#505A5C',  // Darker gray for dark mode
};

export const LIGHT_THEME: ColorTheme = {
  floor: '#D4C4A8',           // Beige/Tan concrete
  walls: '#E0DDD5',           // Light warm gray walls
  rackStructure: RACK_COLORS.uprightBlue, // Blue uprights
  binEmpty: '#B0A899',        // Wireframe outline
  binOccupied: '#E07020',     // Solid orange boxes
  aisles: '#C9BFA8',          // Marked paths
  selectionHighlight: '#FFD700', // Gold highlight
  background: '#F5F5F0',      // Light warm background
};

export const DARK_THEME: ColorTheme = {
  floor: '#3D3830',           // Dark concrete
  walls: '#2A2825',           // Dark warm gray walls
  rackStructure: RACK_COLORS.uprightBlueDark, // Dark blue uprights
  binEmpty: '#4A4840',        // Dark wireframe
  binOccupied: '#D06018',     // Darker orange boxes
  aisles: '#3A3530',          // Dark marked paths
  selectionHighlight: '#FFD700', // Gold highlight
  background: '#1A1A18',      // Dark background
};

export const getTheme = (isDark: boolean): ColorTheme => {
  return isDark ? DARK_THEME : LIGHT_THEME;
};

// Convert hex to three.js compatible number
export const hexToNumber = (hex: string): number => {
  return parseInt(hex.replace('#', ''), 16);
};

// UI Colors (for sidebar, modals, etc.)
export const UI_COLORS = {
  light: {
    background: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E6E6E6',
    text: {
      primary: '#0A0A0A',
      secondary: '#666666',
      muted: '#999999',
    },
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    accent: '#E07020',
  },
  dark: {
    background: '#09090B',
    card: '#18181B',
    border: '#27272A',
    text: {
      primary: '#F4F4F5',
      secondary: '#A1A1AA',
      muted: '#71717A',
    },
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    accent: '#E07020',
  },
};
