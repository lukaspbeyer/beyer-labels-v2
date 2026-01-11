/**
 * Style Store - Manages label style selection
 */
import { writable, derived } from 'svelte/store';
import type { LabelStyle } from '$utils/types';
import { LABEL_STYLES, DEFAULT_STYLE_ID } from '$utils/labelStyles';

/** Selected style ID */
export const selectedStyleId = writable<string>(DEFAULT_STYLE_ID);

/** All available styles (can be extended at runtime if needed) */
export const styles = writable<Record<string, LabelStyle>>(LABEL_STYLES);

/** Current style configuration (derived from selectedStyleId) */
export const currentStyle = derived(
	[selectedStyleId, styles],
	([$selectedStyleId, $styles]) => $styles[$selectedStyleId] || $styles[DEFAULT_STYLE_ID]
);

/** Google Fonts URL for current style (derived) */
export const currentGoogleFontsUrl = derived(currentStyle, ($currentStyle) => $currentStyle.googleFontsUrl);

/**
 * Select a style by ID
 * Only updates if the style ID is valid
 */
export function selectStyle(styleId: string): void {
	if (styleId in LABEL_STYLES) {
		selectedStyleId.set(styleId);
	}
}

/**
 * Get all available style IDs
 */
export function getAvailableStyleIds(): string[] {
	return Object.keys(LABEL_STYLES);
}

/**
 * Reset to default style
 */
export function resetStyle(): void {
	selectedStyleId.set(DEFAULT_STYLE_ID);
}
