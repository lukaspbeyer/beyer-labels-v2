/**
 * Unified Type Definitions for SvelteKit Migration
 */

// Label Format Types
export interface LabelDimensions {
  width: number;
  height: number;
}

export interface LabelGrid {
  columns: number;
  rows: number;
  total: number;
}

export interface LabelPictogram {
  relativeWidth: number;
  width?: number;
  height?: number;
  maxHeight?: number;
}

export interface LabelTypography {
  mainSize: string;
  subSize: string;
}

export interface LabelPaper {
  size: 'A4' | 'A5' | 'A3' | 'A6';
  orientation: 'portrait' | 'landscape';
}

export interface LabelFormat {
  id: string;
  name: string;
  dimensions: LabelDimensions;
  grid: LabelGrid;
  pictogram: LabelPictogram;
  typography: LabelTypography;
  hasPictogram: boolean;
  paper: LabelPaper;
  isSmallLabel?: boolean;  // For layout distinction (horizontal vs vertical)
  orientation: 'landscape' | 'portrait';  // Content orientation
  physicalLabelId?: string;  // Reference to physical label (for portrait formats)
}

// Label Data Types
export interface Label {
  id: string;
  mainText: string;
  subText?: string;
  pictogram?: {
    imageUrl?: string;
    prompt?: string;
    position: 'left' | 'right';
  };
}

// Print Data Types - Simplified for single label
export interface PrintData {
  label: Label;
  format: {
    size: string;
    position: number;  // Position of the single label on the grid
  };
  formatConfig?: LabelFormat;
  styleId?: string;  // Optional style ID for print rendering
}

// Environment Types (for Cloudflare Workers)
export interface Env {
  OPENAI_API_KEY: string;
  ENVIRONMENT?: string;
}

// API Response Types
export interface PictogramResponse {
  success: boolean;
  imageUrls?: string[];  // Changed to array for multiple images
  error?: string;
}

// Form State Types
export interface LabelFormState {
  headline: string;
  body: string;
}

// Print Setup Types - Simplified for single label
export interface PrintSetupState {
  position: number;  // Position of the single label
  selectedFormat: string;
}

// ============================================
// Label Style System Types
// ============================================

// Font configuration for a single font
export interface FontConfig {
  family: string;
  weight: number;
  sizeVariants: { small: string; large: string };
  lineHeight: string;
  letterSpacing: string;
  textTransform: 'none' | 'uppercase' | 'lowercase';
}

// Style color configuration
export interface StyleColors {
  headline: string;
  body: string;
}

// Style typography/layout configuration
export interface StyleTypography {
  containerPadding: string;
  containerTextAlign: 'left' | 'center' | 'right';
  bodyMarginTop: string;
  pictogramHeight: string;
  pictogramMarginBottom: string;
  markdownParagraphMargin: string;  // Spacing between markdown paragraphs (em units)
}

// Complete label style definition
export interface LabelStyle {
  id: string;
  name: string;
  description: string;
  fonts: {
    headline: FontConfig;
    body: FontConfig;
  };
  colors: StyleColors;
  typography: StyleTypography;
  googleFontsUrl: string;
}