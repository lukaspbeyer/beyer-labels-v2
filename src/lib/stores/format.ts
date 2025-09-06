/**
 * Format Store - Manages label format selection and configuration
 * Simplified for single-label printing
 */
import { writable, derived } from 'svelte/store';
import type { LabelFormat } from '$utils/types';
import { LABEL_FORMATS } from '$utils/labelFormats';

// Selected format ID
export const selectedFormatId = writable('105x74');

// All available formats
export const formats = writable<Record<string, LabelFormat>>(LABEL_FORMATS);

// Current format configuration
export const currentFormat = derived(
  [selectedFormatId, formats],
  ([$selectedFormatId, $formats]) => $formats[$selectedFormatId] || $formats['105x74']
);

// Position where the single label should be printed on the grid
export const labelPosition = writable(0);

// Update selected format
export function selectFormat(formatId: string) {
  selectedFormatId.set(formatId);
  // Reset label position when format changes
  labelPosition.set(0);
}

// Maximum position index for current format
export const maxPosition = derived(
  currentFormat,
  ($currentFormat) => $currentFormat.grid.total - 1
);