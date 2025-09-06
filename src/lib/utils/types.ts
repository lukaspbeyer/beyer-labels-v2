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