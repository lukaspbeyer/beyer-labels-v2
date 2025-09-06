/**
 * Pictogram Store - Manages AI-generated pictogram state
 */
import { writable, derived } from 'svelte/store';
import type { PictogramResponse } from '$utils/types';

// Generation state
export const isGenerating = writable(false);
export const generationError = writable<string | undefined>();

// No history needed - just generate new pictograms as needed

// Generate pictogram
export async function generatePictogram(prompt: string, size: string = '1024x1024'): Promise<PictogramResponse> {
  isGenerating.set(true);
  generationError.set(undefined);
  
  try {
    const response = await fetch('/api/generate-pictogram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, size })
    });
    
    const data: PictogramResponse = await response.json();
    
    if (!data.success || !data.imageUrl) {
      throw new Error(data.error || 'Failed to generate pictogram');
    }
    
    // No history needed
    
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