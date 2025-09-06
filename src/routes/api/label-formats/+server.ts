/**
 * API Route: Label Formats
 * Returns all available label format configurations
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEnhancedFormats } from '$lib/utils/labelFormats';

export const GET: RequestHandler = async () => {
  // Get formats with calculated pictogram dimensions
  const formats = getEnhancedFormats();
  
  return json(formats);
};