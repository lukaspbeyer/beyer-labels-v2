/**
 * Label Style Registry
 * Central registry for all label styles with their specifications
 */

import type { LabelStyle } from './types';

/**
 * Predefined label styles
 * Each style works with any label format (small or large)
 */
export const LABEL_STYLES: Record<string, LabelStyle> = {
	ghibli: {
		id: 'ghibli',
		name: 'Ghibli Travel',
		description: 'Nostalgisch, warm, verspielt',
		fonts: {
			headline: {
				family: "'Playfair Display', serif",
				weight: 600,
				sizeVariants: { small: '32px', large: '34px' },
				lineHeight: '1.5',
				letterSpacing: '0.02em',
				textTransform: 'none'
			},
			body: {
				family: "'Quicksand', sans-serif",
				weight: 400,
				sizeVariants: { small: '26px', large: '25px' },
				lineHeight: '1.7',
				letterSpacing: '0.03em',
				textTransform: 'none'
			}
		},
		colors: {
			headline: '#2d2520',
			body: '#5a5248'
		},
		typography: {
			containerPadding: '32px',
			containerTextAlign: 'center',
			bodyMarginTop: '4mm',
			pictogramHeight: '50mm',
			pictogramMarginBottom: '8mm',
			markdownParagraphMargin: '0.7em'
		},
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Quicksand:wght@400;700&display=swap'
	},

	'ghibli-compact': {
		id: 'ghibli-compact',
		name: 'Ghibli Compact',
		description: 'Platzsparend, linksbündig, schwarz',
		fonts: {
			headline: {
				family: "'Playfair Display', serif",
				weight: 600,
				sizeVariants: { small: '28px', large: '30px' },
				lineHeight: '1.15',
				letterSpacing: '0.01em',
				textTransform: 'none'
			},
			body: {
				family: "'Quicksand', sans-serif",
				weight: 400,
				sizeVariants: { small: '17px', large: '19px' },
				lineHeight: '1.3',
				letterSpacing: '0.02em',
				textTransform: 'none'
			}
		},
		colors: {
			headline: '#000000',
			body: '#000000'
		},
		typography: {
			containerPadding: '20px',
			containerTextAlign: 'left',
			bodyMarginTop: '0mm',
			pictogramHeight: '40mm',
			pictogramMarginBottom: '5mm',
			markdownParagraphMargin: '1.6em'
		},
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Quicksand:wght@400;700&display=swap'
	},

	berlin: {
		id: 'berlin',
		name: 'Berlin Brutalist',
		description: 'Minimalistisch, hochkontrastreich, ADHS-freundlich',
		fonts: {
			headline: {
				family: "'Inter', sans-serif",
				weight: 700,
				sizeVariants: { small: '32px', large: '38px' },
				lineHeight: '1.2',
				letterSpacing: '0',
				textTransform: 'uppercase'
			},
			body: {
				family: "'Inter', sans-serif",
				weight: 400,
				sizeVariants: { small: '18px', large: '20px' },
				lineHeight: '1.4',
				letterSpacing: '0',
				textTransform: 'none'
			}
		},
		colors: {
			headline: '#000000',
			body: '#000000'
		},
		typography: {
			containerPadding: '24px',
			containerTextAlign: 'left',
			bodyMarginTop: '2mm',
			pictogramHeight: '45mm',
			pictogramMarginBottom: '6mm',
			markdownParagraphMargin: '0.5em'
		},
		googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap'
	}
};

/** Default style ID */
export const DEFAULT_STYLE_ID = 'ghibli';

/**
 * Get a label style by ID
 * Returns default style if ID not found
 */
export function getStyle(styleId: string): LabelStyle {
	return LABEL_STYLES[styleId] || LABEL_STYLES[DEFAULT_STYLE_ID];
}

/**
 * Get all available style IDs
 */
export function getStyleIds(): string[] {
	return Object.keys(LABEL_STYLES);
}

/**
 * Get all available styles as array
 */
export function getAllStyles(): LabelStyle[] {
	return Object.values(LABEL_STYLES);
}

/**
 * Check if a style ID is valid
 */
export function isValidStyleId(styleId: string): boolean {
	return styleId in LABEL_STYLES;
}

/**
 * Get font size for a specific format size
 */
export function getFontSizeForFormat(
	style: LabelStyle,
	fontType: 'headline' | 'body',
	isSmallLabel: boolean
): string {
	const font = style.fonts[fontType];
	return isSmallLabel ? font.sizeVariants.small : font.sizeVariants.large;
}
