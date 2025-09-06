/**
 * Label Store - Manages label text and content
 * Simplified for single-label printing
 */
import { writable, derived } from 'svelte/store';
import type { Label } from '$utils/types';
import { currentFormat } from './format';

// Main label text
export const headline = writable('');
export const body = writable('');

// Pictogram state (format-driven)
export const pictogramPosition = writable<'left' | 'right'>('left');
export const pictogramUrl = writable<string | undefined>();
export const pictogramPrompt = writable<string | undefined>();

// Computed: pictogram required based on format
export const pictogramRequired = derived(
  currentFormat,
  ($format) => $format?.hasPictogram || false
);

// Combined label state - the single label to be printed
export const currentLabel = derived(
  [headline, body, pictogramRequired, pictogramPosition, pictogramUrl, pictogramPrompt],
  ([$headline, $body, $pictogramRequired, $pictogramPosition, $pictogramUrl, $pictogramPrompt]) => ({
    id: crypto.randomUUID(),
    mainText: $headline,
    subText: $body,
    pictogram: $pictogramRequired ? {
      position: $pictogramPosition,
      imageUrl: $pictogramUrl,
      prompt: $pictogramPrompt
    } : undefined
  } as Label)
);

// Clear/reset the current label
export function clearLabel() {
  headline.set('');
  body.set('');
  pictogramUrl.set(undefined);
  pictogramPrompt.set(undefined);
}