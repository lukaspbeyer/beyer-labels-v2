/**
 * Pictogram Store - Manages AI-generated pictogram state
 */
import { writable, derived } from 'svelte/store';
import type { PictogramResponse } from '$utils/types';

// Generation state
export const isGenerating = writable(false);
export const generationError = writable<string | undefined>();

// Store for all generated pictograms (4 options)
export const generatedPictograms = writable<string[]>([]);

// Store for selected pictogram index
export const selectedPictogramIndex = writable<number | null>(null);

// Derived store for the currently selected pictogram URL
export const selectedPictogramUrl = derived(
  [generatedPictograms, selectedPictogramIndex],
  ([$generatedPictograms, $selectedPictogramIndex]) => {
    if ($selectedPictogramIndex !== null && $generatedPictograms[$selectedPictogramIndex]) {
      return $generatedPictograms[$selectedPictogramIndex];
    }
    return undefined;
  }
);

// Generate multiple pictograms
export async function generatePictograms(prompt: string, size: string = '1024x1024', count: number = 4): Promise<PictogramResponse> {
  isGenerating.set(true);
  generationError.set(undefined);
  
  try {
    const response = await fetch('/api/generate-pictogram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, size, count })
    });
    
    const data: PictogramResponse = await response.json();
    
    if (!data.success || !data.imageUrls || data.imageUrls.length === 0) {
      throw new Error(data.error || 'Failed to generate pictograms');
    }
    
    // Store all generated pictograms
    generatedPictograms.set(data.imageUrls);
    
    // Auto-select the first one
    selectedPictogramIndex.set(0);
    
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    generationError.set(errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  } finally {
    isGenerating.set(false);
  }
}

// Select a specific pictogram
export function selectPictogram(index: number) {
  selectedPictogramIndex.set(index);
}

// Clear all pictograms
export function clearPictograms() {
  generatedPictograms.set([]);
  selectedPictogramIndex.set(null);
}