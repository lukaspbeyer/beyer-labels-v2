/**
 * API Route: Generate Pictogram
 * Generates AI pictograms using OpenAI's GPT-Image-1
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY } from '$env/static/private';
import type { PictogramResponse } from '$lib/utils/types';

// Validate DALL-E size parameter
function validateDalleSize(size: string): string {
  const validSizes = ['1024x1024', '1536x1024', '1024x1536'];
  return validSizes.includes(size) ? size : '1024x1024';
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const { prompt, size = '1024x1024' } = await request.json();
    
    if (!prompt) {
      return json<PictogramResponse>({ 
        success: false, 
        error: 'No prompt provided' 
      }, { status: 400 });
    }
    
    // Validate size parameter
    const dalleSize = validateDalleSize(size);
    
    // Get API key from environment
    const apiKey = OPENAI_API_KEY || platform?.env?.OPENAI_API_KEY;
    
    if (!apiKey) {
      return json<PictogramResponse>({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }
    
    // Call OpenAI API with GPT-Image-1 for transparent backgrounds
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        background: 'transparent',
        output_format: 'png',
        n: 1,
        size: dalleSize,
        quality: 'high'
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }
    
    const data: any = await response.json();
    
    // Handle both URL and base64 responses
    if (data.data && data.data[0]) {
      const imageData = data.data[0];
      const imageUrl = imageData.url || (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : null);
      
      if (imageUrl) {
        return json<PictogramResponse>({
          success: true,
          imageUrl: imageUrl
        });
      }
    }
    
    throw new Error('Invalid response from OpenAI API - no image data found');
    
  } catch (error) {
    console.error('Error generating pictogram:', error);
    return json<PictogramResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate pictogram'
    }, { status: 500 });
  }
};