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

export interface LabelFormat {
  id: string;
  name: string;
  dimensions: LabelDimensions;
  grid: LabelGrid;
  pictogram: LabelPictogram;
  typography: LabelTypography;
  hasPictogram: boolean;
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

// Print Data Types
export interface PrintData {
  labels: Label[];
  format: {
    size: string;
    startPosition: number;
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
  imageUrl?: string;
  error?: string;
}

// Form State Types
export interface LabelFormState {
  headline: string;
  body: string;
}

// Print Setup Types
export interface PrintSetupState {
  count: number;
  startPosition: number;
  selectedFormat: string;
}