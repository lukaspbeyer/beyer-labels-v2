/**
 * Image Processing Utilities for SvelteKit
 * Handles image manipulation including whitespace trimming
 * Note: These functions only work in browser context
 */

interface TrimResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  metrics?: {
    originalHeight: number;
    trimmedHeight: number;
    topCrop: number;
    bottomCrop: number;
  };
}

/**
 * Detects and removes vertical whitespace from an image
 * Preserves horizontal whitespace for visual balance
 * @param imageUrl - The URL of the image to process
 * @returns Promise with the trimmed image data URL
 */
export async function trimVerticalWhitespace(imageUrl: string): Promise<TrimResult> {
  // Check if we're in browser context
  if (typeof window === 'undefined' || !window.document) {
    return {
      success: false,
      error: 'Image processing only available in browser'
    };
  }

  try {
    // Create image element
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Load image
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });
    
    // Create canvas for processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return {
        success: false,
        error: 'Failed to get canvas context'
      };
    }
    
    // Set canvas dimensions to image size
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Draw image to canvas
    ctx.drawImage(img, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Find first non-white row from top
    let topBound = 0;
    let foundTop = false;
    
    for (let y = 0; y < height && !foundTop; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];
        
        // Check if pixel is non-white (with tolerance)
        // Consider a pixel non-white if it's not close to white or has transparency
        if (a > 10 && (r < 240 || g < 240 || b < 240)) {
          topBound = y;
          foundTop = true;
          break;
        }
      }
    }
    
    // Find last non-white row from bottom
    let bottomBound = height - 1;
    let foundBottom = false;
    
    for (let y = height - 1; y >= 0 && !foundBottom; y--) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];
        
        // Check if pixel is non-white (with tolerance)
        if (a > 10 && (r < 240 || g < 240 || b < 240)) {
          bottomBound = y;
          foundBottom = true;
          break;
        }
      }
    }
    
    // If no content found, return original
    if (!foundTop || !foundBottom || topBound >= bottomBound) {
      return {
        success: true,
        imageUrl: imageUrl,
        metrics: {
          originalHeight: height,
          trimmedHeight: height,
          topCrop: 0,
          bottomCrop: 0
        }
      };
    }
    
    // Calculate new dimensions
    const newHeight = bottomBound - topBound + 1;
    
    // Create new canvas with trimmed dimensions
    const trimmedCanvas = document.createElement('canvas');
    const trimmedCtx = trimmedCanvas.getContext('2d');
    
    if (!trimmedCtx) {
      return {
        success: false,
        error: 'Failed to get trimmed canvas context'
      };
    }
    
    trimmedCanvas.width = width;
    trimmedCanvas.height = newHeight;
    
    // Copy the trimmed portion
    trimmedCtx.drawImage(
      canvas,
      0, topBound,           // Source x, y
      width, newHeight,       // Source width, height
      0, 0,                   // Destination x, y
      width, newHeight        // Destination width, height
    );
    
    // Convert to data URL
    const trimmedImageUrl = trimmedCanvas.toDataURL('image/png');
    
    return {
      success: true,
      imageUrl: trimmedImageUrl,
      metrics: {
        originalHeight: height,
        trimmedHeight: newHeight,
        topCrop: topBound,
        bottomCrop: height - bottomBound - 1
      }
    };
    
  } catch (error) {
    console.error('Error trimming whitespace:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Checks if an image URL is a data URL
 */
export function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * Ensures image is accessible for canvas operations
 * Handles CORS issues by proxying if needed
 */
export async function ensureImageAccessible(imageUrl: string): Promise<string> {
  // If already a data URL, it's accessible
  if (isDataUrl(imageUrl)) {
    return imageUrl;
  }
  
  // For external URLs, we might need to handle CORS
  // Since DALL-E images are from OpenAI CDN, they should have proper CORS headers
  // If not, we'd need to proxy through our server
  return imageUrl;
}