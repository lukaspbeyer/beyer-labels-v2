/**
 * Format Store - Manages label format selection and configuration
 */
import { writable, derived } from 'svelte/store';
import type { LabelFormat } from '$utils/types';
import { LABEL_FORMATS, getLabelFormat } from '$utils/labelFormats';

// Selected format ID
export const selectedFormatId = writable('105x74');

// All available formats
export const formats = writable<Record<string, LabelFormat>>(LABEL_FORMATS);

// Current format configuration
export const currentFormat = derived(
  [selectedFormatId, formats],
  ([$selectedFormatId, $formats]) => $formats[$selectedFormatId] || $formats['105x74']
);

// Print position in grid
export const startPosition = writable(0);

// Number of labels to print
export const labelCount = writable(1);

// Update selected format
export function selectFormat(formatId: string) {
  selectedFormatId.set(formatId);
  // Reset start position when format changes
  startPosition.set(0);
}

// Validate start position for current format
export const maxStartPosition = derived(
  currentFormat,
  ($currentFormat) => $currentFormat.grid.total - 1
);

// Available positions for current format
export const availablePositions = derived(
  [currentFormat, labelCount],
  ([$currentFormat, $labelCount]) => {
    const total = $currentFormat.grid.total;
    const maxStart = Math.max(0, total - $labelCount);
    return Array.from({ length: maxStart + 1 }, (_, i) => i);
  }
);