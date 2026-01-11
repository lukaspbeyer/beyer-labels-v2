import { describe, it, expect } from 'vitest';
import {
	LABEL_FORMATS,
	getLabelFormat,
	getFormatIds,
	getEnhancedFormats,
	calculatePictogramDimensions,
	needsContentRotation,
	getPhysicalDimensions
} from './labelFormats';

describe('labelFormats', () => {
	describe('LABEL_FORMATS registry', () => {
		it('should contain all expected formats', () => {
			expect(LABEL_FORMATS).toHaveProperty('105x74');
			expect(LABEL_FORMATS).toHaveProperty('74x105');
			expect(LABEL_FORMATS).toHaveProperty('210x100');
		});

		it('should have exactly 3 formats', () => {
			expect(Object.keys(LABEL_FORMATS)).toHaveLength(3);
		});

		it('all formats should have orientation property', () => {
			Object.values(LABEL_FORMATS).forEach((format) => {
				expect(format).toHaveProperty('orientation');
				expect(['landscape', 'portrait']).toContain(format.orientation);
			});
		});

		it('all formats should have required properties', () => {
			Object.values(LABEL_FORMATS).forEach((format) => {
				expect(format).toHaveProperty('id');
				expect(format).toHaveProperty('name');
				expect(format).toHaveProperty('dimensions');
				expect(format).toHaveProperty('dimensions.width');
				expect(format).toHaveProperty('dimensions.height');
				expect(format).toHaveProperty('grid');
				expect(format).toHaveProperty('pictogram');
				expect(format).toHaveProperty('typography');
				expect(format).toHaveProperty('paper');
			});
		});
	});

	describe('105x74 format (landscape)', () => {
		it('should have correct dimensions', () => {
			const format = LABEL_FORMATS['105x74'];
			expect(format.dimensions.width).toBe(105);
			expect(format.dimensions.height).toBe(74);
		});

		it('should be landscape orientation', () => {
			const format = LABEL_FORMATS['105x74'];
			expect(format.orientation).toBe('landscape');
		});

		it('should have 8 labels per page (2x4 grid)', () => {
			const format = LABEL_FORMATS['105x74'];
			expect(format.grid.columns).toBe(2);
			expect(format.grid.rows).toBe(4);
			expect(format.grid.total).toBe(8);
		});

		it('should not have physicalLabelId', () => {
			const format = LABEL_FORMATS['105x74'];
			expect(format.physicalLabelId).toBeUndefined();
		});
	});

	describe('74x105 format (portrait)', () => {
		it('should have rotated logical dimensions', () => {
			const format = LABEL_FORMATS['74x105'];
			expect(format.dimensions.width).toBe(74);
			expect(format.dimensions.height).toBe(105);
		});

		it('should be portrait orientation', () => {
			const format = LABEL_FORMATS['74x105'];
			expect(format.orientation).toBe('portrait');
		});

		it('should reference 105x74 as physical label', () => {
			const format = LABEL_FORMATS['74x105'];
			expect(format.physicalLabelId).toBe('105x74');
		});

		it('should have same grid as 105x74', () => {
			const portrait = LABEL_FORMATS['74x105'];
			const landscape = LABEL_FORMATS['105x74'];
			expect(portrait.grid.columns).toBe(landscape.grid.columns);
			expect(portrait.grid.rows).toBe(landscape.grid.rows);
			expect(portrait.grid.total).toBe(landscape.grid.total);
		});

		it('should be marked as small label', () => {
			const format = LABEL_FORMATS['74x105'];
			expect(format.isSmallLabel).toBe(true);
		});
	});

	describe('210x100 format (large)', () => {
		it('should be landscape orientation', () => {
			const format = LABEL_FORMATS['210x100'];
			expect(format.orientation).toBe('landscape');
		});

		it('should have pictogram enabled', () => {
			const format = LABEL_FORMATS['210x100'];
			expect(format.hasPictogram).toBe(true);
		});

		it('should have single label per page', () => {
			const format = LABEL_FORMATS['210x100'];
			expect(format.grid.total).toBe(1);
		});
	});

	describe('getLabelFormat', () => {
		it('should return correct format for valid ID', () => {
			const format = getLabelFormat('105x74');
			expect(format.id).toBe('105x74');
			expect(format.dimensions.width).toBe(105);
		});

		it('should return portrait format', () => {
			const format = getLabelFormat('74x105');
			expect(format.id).toBe('74x105');
			expect(format.orientation).toBe('portrait');
		});

		it('should return default format for invalid ID', () => {
			const format = getLabelFormat('nonexistent');
			expect(format.id).toBe('105x74');
		});
	});

	describe('getFormatIds', () => {
		it('should return array of format IDs', () => {
			const ids = getFormatIds();
			expect(Array.isArray(ids)).toBe(true);
			expect(ids).toContain('105x74');
			expect(ids).toContain('74x105');
			expect(ids).toContain('210x100');
		});

		it('should return exactly 3 IDs', () => {
			const ids = getFormatIds();
			expect(ids).toHaveLength(3);
		});
	});

	describe('needsContentRotation', () => {
		it('should return false for landscape formats', () => {
			expect(needsContentRotation('105x74')).toBe(false);
			expect(needsContentRotation('210x100')).toBe(false);
		});

		it('should return true for portrait format', () => {
			expect(needsContentRotation('74x105')).toBe(true);
		});

		it('should return false for nonexistent format', () => {
			expect(needsContentRotation('nonexistent')).toBe(false);
		});
	});

	describe('getPhysicalDimensions', () => {
		it('should return own dimensions for landscape formats', () => {
			const dims = getPhysicalDimensions('105x74');
			expect(dims.width).toBe(105);
			expect(dims.height).toBe(74);
		});

		it('should return physical label dimensions for portrait format', () => {
			const dims = getPhysicalDimensions('74x105');
			// Portrait uses same physical label as 105x74
			expect(dims.width).toBe(105);
			expect(dims.height).toBe(74);
		});

		it('should return large format dimensions', () => {
			const dims = getPhysicalDimensions('210x100');
			expect(dims.width).toBe(210);
			expect(dims.height).toBe(100);
		});

		it('should return default dimensions for nonexistent format', () => {
			const dims = getPhysicalDimensions('nonexistent');
			expect(dims.width).toBe(105);
			expect(dims.height).toBe(74);
		});
	});

	describe('calculatePictogramDimensions', () => {
		it('should calculate correct width based on relative width', () => {
			const dims = calculatePictogramDimensions(105, 74, 0.33);
			expect(dims.width).toBe(35); // 105 * 0.33 rounded
		});

		it('should calculate height as 80% of label height', () => {
			const dims = calculatePictogramDimensions(105, 74, 0.33);
			expect(dims.height).toBe(59); // 74 * 0.8 rounded
		});

		it('should return fixed maxHeight of 50mm', () => {
			const dims = calculatePictogramDimensions(105, 74, 0.33);
			expect(dims.maxHeight).toBe(50);
		});

		it('should work with different label sizes', () => {
			const dims = calculatePictogramDimensions(210, 100, 0.33);
			expect(dims.width).toBe(69); // 210 * 0.33 rounded
			expect(dims.height).toBe(80); // 100 * 0.8 rounded
			expect(dims.maxHeight).toBe(50);
		});
	});

	describe('getEnhancedFormats', () => {
		it('should return all formats', () => {
			const enhanced = getEnhancedFormats();
			expect(enhanced).toHaveProperty('105x74');
			expect(enhanced).toHaveProperty('74x105');
			expect(enhanced).toHaveProperty('210x100');
		});

		it('should add calculated pictogram dimensions', () => {
			const enhanced = getEnhancedFormats();
			const format = enhanced['105x74'];

			expect(format.pictogram.width).toBeDefined();
			expect(format.pictogram.height).toBeDefined();
			expect(format.pictogram.maxHeight).toBe(50);
		});

		it('should preserve original format properties', () => {
			const enhanced = getEnhancedFormats();
			const format = enhanced['74x105'];

			expect(format.id).toBe('74x105');
			expect(format.orientation).toBe('portrait');
			expect(format.physicalLabelId).toBe('105x74');
		});
	});
});
