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
    const { prompt, size = '1024x1024', count = 4 } = await request.json();
    
    if (!prompt) {
      const bodyNoPrompt: PictogramResponse = {
        success: false,
        error: 'No prompt provided'
      };
      return json(bodyNoPrompt, { status: 400 });
    }
    
    // Validate size parameter
    const dalleSize = validateDalleSize(size);
    
    // Limit count to reasonable number (max 4 for cost and performance)
    const imageCount = Math.min(Math.max(1, count), 4);
    
    // Get API key from environment
    const apiKey = OPENAI_API_KEY || platform?.env?.OPENAI_API_KEY;
    
    if (!apiKey) {
      const bodyNoKey: PictogramResponse = {
        success: false,
        error: 'OpenAI API key not configured'
      };
      return json(bodyNoKey, { status: 500 });
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
        n: imageCount,
        size: dalleSize,
        quality: 'high'
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }
    
    const data: any = await response.json();
    
    // Handle multiple images
    if (data.data && data.data.length > 0) {
      const imageUrls = data.data.map((imageData: any) => {
        return imageData.url || (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : null);
      }).filter((url: string | null) => url !== null);
      
      if (imageUrls.length > 0) {
        const bodySuccess: PictogramResponse = {
          success: true,
          imageUrls
        };
        return json(bodySuccess);
      }
    }
    
    throw new Error('Invalid response from OpenAI API - no image data found');
    
  } catch (error) {
    console.error('Error generating pictogram:', error);
    const bodyError: PictogramResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate pictogram'
    };
    return json(bodyError, { status: 500 });
  }
};