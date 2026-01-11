/**
 * Label Format Configuration for SvelteKit
 * Central registry for all label formats with their specifications
 */

import type { LabelFormat, LabelDimensions } from './types';

/**
 * Calculate pictogram dimensions based on label size and relative width
 * Fixed maxHeight to 50mm for Ghibli Travel style (both formats)
 */
export function calculatePictogramDimensions(
  labelWidth: number,
  labelHeight: number,
  relativeWidth: number
): { width: number; height: number; maxHeight: number } {
  const width = Math.round(labelWidth * relativeWidth);
  const height = Math.round(labelHeight * 0.8); // 80% of label height (legacy)
  const maxHeight = 50; // Fixed 50mm for balanced Ghibli Travel layout

  return { width, height, maxHeight };
}

/**
 * Predefined label formats with optimized settings
 * Following Beyer Design Guidelines specifications
 */
export const LABEL_FORMATS: Record<string, LabelFormat> = {
  // Primary format: 105×74mm (8 labels per A4) - Landscape
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
    isSmallLabel: true,   // Horizontal layout
    orientation: 'landscape',
    paper: {
      size: 'A4',
      orientation: 'portrait'
    }
  },

  // Portrait format: 74×105mm - uses same physical label as 105×74, content rotated
  '74x105': {
    id: '74x105',
    name: '74×105mm (Hochkant)',
    dimensions: {
      width: 74,   // Logical dimensions (rotated content)
      height: 105
    },
    grid: {
      columns: 2,
      rows: 4,
      total: 8
    },
    pictogram: {
      relativeWidth: 0.4  // Wider relative to narrower label
    },
    typography: {
      mainSize: '12pt',
      subSize: '9pt'
    },
    hasPictogram: false,
    isSmallLabel: true,
    orientation: 'portrait',
    physicalLabelId: '105x74',  // References physical label
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
    orientation: 'landscape',
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

/**
 * Check if format needs content rotation for printing
 * Portrait formats have their content rotated 90° to fit in landscape physical labels
 */
export function needsContentRotation(formatId: string): boolean {
  const format = LABEL_FORMATS[formatId];
  return format?.orientation === 'portrait';
}

/**
 * Get physical dimensions for a format
 * Portrait formats return their physical (unrotated) cell dimensions
 */
export function getPhysicalDimensions(formatId: string): LabelDimensions {
  const format = LABEL_FORMATS[formatId];
  if (!format) {
    return { width: 105, height: 74 };  // Default fallback
  }

  // Portrait formats reference a physical label
  if (format.orientation === 'portrait' && format.physicalLabelId) {
    const physicalFormat = LABEL_FORMATS[format.physicalLabelId];
    return physicalFormat?.dimensions || format.dimensions;
  }

  return format.dimensions;
}