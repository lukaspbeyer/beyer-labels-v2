/**
 * Label Format Configuration for SvelteKit
 * Central registry for all label formats with their specifications
 */

import type { LabelFormat } from './types';

/**
 * Calculate pictogram dimensions based on label size and relative width
 */
export function calculatePictogramDimensions(
  labelWidth: number,
  labelHeight: number,
  relativeWidth: number
): { width: number; height: number; maxHeight: number } {
  const width = Math.round(labelWidth * relativeWidth);
  const height = Math.round(labelHeight * 0.8); // 80% of label height
  const maxHeight = Math.round(labelHeight * 0.9); // Max 90% of label height
  
  return { width, height, maxHeight };
}

/**
 * Predefined label formats with optimized settings
 * Following Beyer Design Guidelines specifications
 */
export const LABEL_FORMATS: Record<string, LabelFormat> = {
  // Primary format: 105×74mm (8 labels per A4)
  '105x74': {
    id: '105x74',
    name: '105×74mm',
    dimensions: {
      width: 105,
      height: 74
    },
    grid: {
      columns: 2,
      rows: 4,
      total: 8
    },
    pictogram: {
      relativeWidth: 0.33  // 1/3 of label width
    },
    typography: {
      mainSize: '12pt',  // Beyer spec: 12pt for labels
      subSize: '9pt'     // Beyer spec: 9pt for subtitles
    },
    hasPictogram: false,  // Small labels = text only
    paper: {
      size: 'A4',
      orientation: 'portrait'
    }
  },
  
  // Large format: 210×100mm (1 label per A5 landscape)
  '210x100': {
    id: '210x100',
    name: '210×100mm',
    dimensions: {
      width: 210,
      height: 100
    },
    grid: {
      columns: 1,
      rows: 1,
      total: 1
    },
    pictogram: {
      relativeWidth: 0.33  // 1/3 of label width
    },
    typography: {
      mainSize: '22pt',  // Larger for big signs, dominanter als Piktogramm
      subSize: '12pt'
    },
    hasPictogram: true,   // Large signs = always with pictogram
    paper: {
      size: 'A5',
      orientation: 'landscape'
    }
  }
};

/**
 * Get a label format by ID
 */
export function getLabelFormat(formatId: string): LabelFormat {
  return LABEL_FORMATS[formatId] || LABEL_FORMATS['105x74'];
}

/**
 * Get all available format IDs
 */
export function getFormatIds(): string[] {
  return Object.keys(LABEL_FORMATS);
}

/**
 * Enhance formats with calculated pictogram dimensions
 */
export function getEnhancedFormats(): Record<string, LabelFormat> {
  return Object.fromEntries(
    Object.entries(LABEL_FORMATS).map(([key, format]) => {
      const dimensions = calculatePictogramDimensions(
        format.dimensions.width,
        format.dimensions.height,
        format.pictogram.relativeWidth
      );
      
      return [key, {
        ...format,
        pictogram: {
          ...format.pictogram,
          ...dimensions
        }
      }];
    })
  );
}