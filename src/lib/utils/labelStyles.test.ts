import { describe, it, expect } from 'vitest';
import {
	LABEL_STYLES,
	DEFAULT_STYLE_ID,
	getStyle,
	getStyleIds,
	getAllStyles,
	isValidStyleId,
	getFontSizeForFormat
} from './labelStyles';

describe('labelStyles', () => {
	describe('LABEL_STYLES registry', () => {
		it('should contain ghibli, ghibli-compact and berlin styles', () => {
			expect(LABEL_STYLES).toHaveProperty('ghibli');
			expect(LABEL_STYLES).toHaveProperty('ghibli-compact');
			expect(LABEL_STYLES).toHaveProperty('berlin');
		});

		it('should have exactly 3 styles', () => {
			expect(Object.keys(LABEL_STYLES)).toHaveLength(3);
		});

		it('should have valid structure for each style', () => {
			Object.values(LABEL_STYLES).forEach((style) => {
				expect(style).toHaveProperty('id');
				expect(style).toHaveProperty('name');
				expect(style).toHaveProperty('description');
				expect(style).toHaveProperty('fonts');
				expect(style).toHaveProperty('fonts.headline');
				expect(style).toHaveProperty('fonts.body');
				expect(style).toHaveProperty('colors');
				expect(style).toHaveProperty('colors.headline');
				expect(style).toHaveProperty('colors.body');
				expect(style).toHaveProperty('typography');
				expect(style).toHaveProperty('typography.markdownParagraphMargin');
				expect(style).toHaveProperty('googleFontsUrl');
			});
		});

		it('should have valid font config for each style', () => {
			Object.values(LABEL_STYLES).forEach((style) => {
				['headline', 'body'].forEach((fontType) => {
					const font = style.fonts[fontType as 'headline' | 'body'];
					expect(font).toHaveProperty('family');
					expect(font).toHaveProperty('weight');
					expect(font).toHaveProperty('sizeVariants');
					expect(font).toHaveProperty('sizeVariants.small');
					expect(font).toHaveProperty('sizeVariants.large');
					expect(font).toHaveProperty('lineHeight');
					expect(font).toHaveProperty('letterSpacing');
					expect(font).toHaveProperty('textTransform');
				});
			});
		});
	});

	describe('Ghibli style specifics', () => {
		it('should have Playfair Display headline font', () => {
			const ghibli = LABEL_STYLES.ghibli;
			expect(ghibli.fonts.headline.family).toContain('Playfair Display');
		});

		it('should have Quicksand body font', () => {
			const ghibli = LABEL_STYLES.ghibli;
			expect(ghibli.fonts.body.family).toContain('Quicksand');
		});

		it('should have warm brown colors', () => {
			const ghibli = LABEL_STYLES.ghibli;
			expect(ghibli.colors.headline).toBe('#2d2520');
			expect(ghibli.colors.body).toBe('#5a5248');
		});

		it('should have center text alignment', () => {
			const ghibli = LABEL_STYLES.ghibli;
			expect(ghibli.typography.containerTextAlign).toBe('center');
		});

		it('should have letter-spacing for both fonts', () => {
			const ghibli = LABEL_STYLES.ghibli;
			expect(ghibli.fonts.headline.letterSpacing).toBe('0.02em');
			expect(ghibli.fonts.body.letterSpacing).toBe('0.03em');
		});

		it('should have medium markdown paragraph margin', () => {
			const ghibli = LABEL_STYLES.ghibli;
			expect(ghibli.typography.markdownParagraphMargin).toBe('0.7em');
		});
	});

	describe('Ghibli Compact style specifics', () => {
		it('should have Playfair Display headline font (same as Ghibli)', () => {
			const compact = LABEL_STYLES['ghibli-compact'];
			expect(compact.fonts.headline.family).toContain('Playfair Display');
		});

		it('should have Quicksand body font (same as Ghibli)', () => {
			const compact = LABEL_STYLES['ghibli-compact'];
			expect(compact.fonts.body.family).toContain('Quicksand');
		});

		it('should have monochromatic black colors', () => {
			const compact = LABEL_STYLES['ghibli-compact'];
			expect(compact.colors.headline).toBe('#000000');
			expect(compact.colors.body).toBe('#000000');
		});

		it('should have left text alignment (unlike center-aligned Ghibli)', () => {
			const compact = LABEL_STYLES['ghibli-compact'];
			const ghibli = LABEL_STYLES.ghibli;
			expect(compact.typography.containerTextAlign).toBe('left');
			expect(ghibli.typography.containerTextAlign).toBe('center');
		});

		it('should have smaller padding than Ghibli', () => {
			const compact = LABEL_STYLES['ghibli-compact'];
			const ghibli = LABEL_STYLES.ghibli;
			expect(compact.typography.containerPadding).toBe('20px');
			expect(ghibli.typography.containerPadding).toBe('32px');
		});

		it('should have smaller body font than Ghibli', () => {
			const compact = LABEL_STYLES['ghibli-compact'];
			const ghibli = LABEL_STYLES.ghibli;
			// Compare small body sizes - compact is slightly smaller
			expect(parseInt(compact.fonts.body.sizeVariants.small)).toBeLessThan(
				parseInt(ghibli.fonts.body.sizeVariants.small)
			);
		});

		it('should have tighter line heights than Ghibli', () => {
			const compact = LABEL_STYLES['ghibli-compact'];
			const ghibli = LABEL_STYLES.ghibli;
			expect(parseFloat(compact.fonts.headline.lineHeight)).toBeLessThan(
				parseFloat(ghibli.fonts.headline.lineHeight)
			);
			expect(parseFloat(compact.fonts.body.lineHeight)).toBeLessThan(
				parseFloat(ghibli.fonts.body.lineHeight)
			);
		});

		it('should have larger markdown paragraph margin than other styles', () => {
			const compact = LABEL_STYLES['ghibli-compact'];
			const ghibli = LABEL_STYLES.ghibli;
			const berlin = LABEL_STYLES.berlin;
			expect(compact.typography.markdownParagraphMargin).toBe('1.5em');
			expect(parseFloat(compact.typography.markdownParagraphMargin)).toBeGreaterThan(
				parseFloat(ghibli.typography.markdownParagraphMargin)
			);
			expect(parseFloat(compact.typography.markdownParagraphMargin)).toBeGreaterThan(
				parseFloat(berlin.typography.markdownParagraphMargin)
			);
		});
	});

	describe('Berlin style specifics (ADHS-optimized)', () => {
		it('should have Inter font for both headline and body', () => {
			const berlin = LABEL_STYLES.berlin;
			expect(berlin.fonts.headline.family).toContain('Inter');
			expect(berlin.fonts.body.family).toContain('Inter');
		});

		it('should have pure black colors for maximum contrast', () => {
			const berlin = LABEL_STYLES.berlin;
			expect(berlin.colors.headline).toBe('#000000');
			expect(berlin.colors.body).toBe('#000000');
		});

		it('should have zero letter-spacing for clean reading', () => {
			const berlin = LABEL_STYLES.berlin;
			expect(berlin.fonts.headline.letterSpacing).toBe('0');
			expect(berlin.fonts.body.letterSpacing).toBe('0');
		});

		it('should have uppercase headline transform', () => {
			const berlin = LABEL_STYLES.berlin;
			expect(berlin.fonts.headline.textTransform).toBe('uppercase');
		});

		it('should have left text alignment', () => {
			const berlin = LABEL_STYLES.berlin;
			expect(berlin.typography.containerTextAlign).toBe('left');
		});

		it('should have smaller body margin for compact layout', () => {
			const berlin = LABEL_STYLES.berlin;
			const ghibli = LABEL_STYLES.ghibli;
			// Berlin should be more compact
			expect(berlin.typography.bodyMarginTop).toBe('2mm');
			expect(ghibli.typography.bodyMarginTop).toBe('4mm');
		});

		it('should have compact markdown paragraph margin (ADHS-friendly)', () => {
			const berlin = LABEL_STYLES.berlin;
			expect(berlin.typography.markdownParagraphMargin).toBe('0.5em');
		});
	});

	describe('DEFAULT_STYLE_ID', () => {
		it('should be ghibli', () => {
			expect(DEFAULT_STYLE_ID).toBe('ghibli');
		});

		it('should exist in LABEL_STYLES', () => {
			expect(LABEL_STYLES[DEFAULT_STYLE_ID]).toBeDefined();
		});
	});

	describe('getStyle', () => {
		it('should return correct style for valid ID', () => {
			const ghibli = getStyle('ghibli');
			expect(ghibli.id).toBe('ghibli');
			expect(ghibli.name).toBe('Ghibli Travel');
		});

		it('should return berlin style for berlin ID', () => {
			const berlin = getStyle('berlin');
			expect(berlin.id).toBe('berlin');
			expect(berlin.name).toBe('Berlin Brutalist');
		});

		it('should return default style for invalid ID', () => {
			const style = getStyle('nonexistent');
			expect(style.id).toBe(DEFAULT_STYLE_ID);
		});

		it('should return default style for empty string', () => {
			const style = getStyle('');
			expect(style.id).toBe(DEFAULT_STYLE_ID);
		});
	});

	describe('getStyleIds', () => {
		it('should return array of style IDs', () => {
			const ids = getStyleIds();
			expect(Array.isArray(ids)).toBe(true);
			expect(ids).toContain('ghibli');
			expect(ids).toContain('ghibli-compact');
			expect(ids).toContain('berlin');
		});

		it('should return exactly 3 IDs', () => {
			const ids = getStyleIds();
			expect(ids).toHaveLength(3);
		});
	});

	describe('getAllStyles', () => {
		it('should return array of all styles', () => {
			const styles = getAllStyles();
			expect(Array.isArray(styles)).toBe(true);
			expect(styles).toHaveLength(3);
		});

		it('should include ghibli style object', () => {
			const styles = getAllStyles();
			expect(styles.some((s) => s.id === 'ghibli')).toBe(true);
		});

		it('should include ghibli-compact style object', () => {
			const styles = getAllStyles();
			expect(styles.some((s) => s.id === 'ghibli-compact')).toBe(true);
		});

		it('should include berlin style object', () => {
			const styles = getAllStyles();
			expect(styles.some((s) => s.id === 'berlin')).toBe(true);
		});
	});

	describe('isValidStyleId', () => {
		it('should return true for ghibli', () => {
			expect(isValidStyleId('ghibli')).toBe(true);
		});

		it('should return true for ghibli-compact', () => {
			expect(isValidStyleId('ghibli-compact')).toBe(true);
		});

		it('should return true for berlin', () => {
			expect(isValidStyleId('berlin')).toBe(true);
		});

		it('should return false for nonexistent ID', () => {
			expect(isValidStyleId('nonexistent')).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(isValidStyleId('')).toBe(false);
		});

		it('should return false for undefined-like strings', () => {
			expect(isValidStyleId('undefined')).toBe(false);
			expect(isValidStyleId('null')).toBe(false);
		});
	});

	describe('getFontSizeForFormat', () => {
		it('should return small size for small labels', () => {
			const style = getStyle('ghibli');
			const size = getFontSizeForFormat(style, 'headline', true);
			expect(size).toBe(style.fonts.headline.sizeVariants.small);
		});

		it('should return large size for large labels', () => {
			const style = getStyle('ghibli');
			const size = getFontSizeForFormat(style, 'headline', false);
			expect(size).toBe(style.fonts.headline.sizeVariants.large);
		});

		it('should work for body font type', () => {
			const style = getStyle('berlin');
			const smallSize = getFontSizeForFormat(style, 'body', true);
			const largeSize = getFontSizeForFormat(style, 'body', false);
			expect(smallSize).toBe('18px');
			expect(largeSize).toBe('20px');
		});
	});
});
