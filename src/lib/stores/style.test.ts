import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	selectedStyleId,
	styles,
	currentStyle,
	currentGoogleFontsUrl,
	selectStyle,
	getAvailableStyleIds,
	resetStyle
} from './style';
import { DEFAULT_STYLE_ID, LABEL_STYLES } from '$utils/labelStyles';

describe('style store', () => {
	beforeEach(() => {
		// Reset to default state before each test
		resetStyle();
	});

	describe('selectedStyleId', () => {
		it('should default to DEFAULT_STYLE_ID', () => {
			expect(get(selectedStyleId)).toBe(DEFAULT_STYLE_ID);
		});

		it('should default to ghibli', () => {
			expect(get(selectedStyleId)).toBe('ghibli');
		});
	});

	describe('styles', () => {
		it('should contain all label styles', () => {
			const allStyles = get(styles);
			expect(allStyles).toHaveProperty('ghibli');
			expect(allStyles).toHaveProperty('ghibli-compact');
			expect(allStyles).toHaveProperty('berlin');
		});

		it('should have same content as LABEL_STYLES', () => {
			const allStyles = get(styles);
			expect(allStyles.ghibli.id).toBe(LABEL_STYLES.ghibli.id);
			expect(allStyles['ghibli-compact'].id).toBe(LABEL_STYLES['ghibli-compact'].id);
			expect(allStyles.berlin.id).toBe(LABEL_STYLES.berlin.id);
		});
	});

	describe('currentStyle', () => {
		it('should derive current style from selectedStyleId', () => {
			const style = get(currentStyle);
			expect(style.id).toBe(DEFAULT_STYLE_ID);
			expect(style.name).toBe('Ghibli Travel');
		});

		it('should update when selectedStyleId changes', () => {
			selectStyle('berlin');
			const style = get(currentStyle);
			expect(style.id).toBe('berlin');
			expect(style.name).toBe('Berlin Brutalist');
		});

		it('should have correct fonts for ghibli style', () => {
			const style = get(currentStyle);
			expect(style.fonts.headline.family).toContain('Playfair Display');
			expect(style.fonts.body.family).toContain('Quicksand');
		});

		it('should have correct fonts for berlin style', () => {
			selectStyle('berlin');
			const style = get(currentStyle);
			expect(style.fonts.headline.family).toContain('Inter');
			expect(style.fonts.body.family).toContain('Inter');
		});
	});

	describe('currentGoogleFontsUrl', () => {
		it('should derive Google Fonts URL from current style', () => {
			const url = get(currentGoogleFontsUrl);
			expect(url).toContain('fonts.googleapis.com');
		});

		it('should include Playfair Display for ghibli style', () => {
			const url = get(currentGoogleFontsUrl);
			expect(url).toContain('Playfair+Display');
		});

		it('should include Inter for berlin style', () => {
			selectStyle('berlin');
			const url = get(currentGoogleFontsUrl);
			expect(url).toContain('Inter');
		});

		it('should update when style changes', () => {
			const ghibliUrl = get(currentGoogleFontsUrl);
			selectStyle('berlin');
			const berlinUrl = get(currentGoogleFontsUrl);

			expect(ghibliUrl).not.toBe(berlinUrl);
			expect(ghibliUrl).toContain('Playfair');
			expect(berlinUrl).toContain('Inter');
		});
	});

	describe('selectStyle', () => {
		it('should update selectedStyleId for valid ID', () => {
			selectStyle('berlin');
			expect(get(selectedStyleId)).toBe('berlin');
		});

		it('should switch back to ghibli', () => {
			selectStyle('berlin');
			selectStyle('ghibli');
			expect(get(selectedStyleId)).toBe('ghibli');
		});

		it('should not update for invalid ID', () => {
			selectStyle('nonexistent');
			expect(get(selectedStyleId)).toBe(DEFAULT_STYLE_ID);
		});

		it('should not update for empty string', () => {
			selectStyle('');
			expect(get(selectedStyleId)).toBe(DEFAULT_STYLE_ID);
		});

		it('should not update for undefined-like strings', () => {
			selectStyle('undefined');
			expect(get(selectedStyleId)).toBe(DEFAULT_STYLE_ID);

			selectStyle('null');
			expect(get(selectedStyleId)).toBe(DEFAULT_STYLE_ID);
		});
	});

	describe('getAvailableStyleIds', () => {
		it('should return array of available style IDs', () => {
			const ids = getAvailableStyleIds();
			expect(Array.isArray(ids)).toBe(true);
			expect(ids).toContain('ghibli');
			expect(ids).toContain('ghibli-compact');
			expect(ids).toContain('berlin');
		});

		it('should return exactly 3 IDs', () => {
			const ids = getAvailableStyleIds();
			expect(ids).toHaveLength(3);
		});
	});

	describe('resetStyle', () => {
		it('should reset to default style', () => {
			selectStyle('berlin');
			expect(get(selectedStyleId)).toBe('berlin');

			resetStyle();
			expect(get(selectedStyleId)).toBe(DEFAULT_STYLE_ID);
		});

		it('should update currentStyle after reset', () => {
			selectStyle('berlin');
			resetStyle();

			const style = get(currentStyle);
			expect(style.id).toBe('ghibli');
		});
	});

	describe('reactivity', () => {
		it('should update derived stores when selectedStyleId changes', () => {
			// Initial state
			expect(get(currentStyle).id).toBe('ghibli');
			expect(get(currentGoogleFontsUrl)).toContain('Playfair');

			// Change style
			selectStyle('berlin');

			// Verify all derived stores updated
			expect(get(currentStyle).id).toBe('berlin');
			expect(get(currentGoogleFontsUrl)).toContain('Inter');
		});
	});
});
