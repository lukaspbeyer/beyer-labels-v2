import { describe, expect, it } from 'vitest';
import { KURA } from '$lib/kura/kura';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { PRODUCTS } from './registry';

const font = loadTestFont(KURA.typeface.font, KURA.typeface.weight);

describe('Produktliste', () => {
	it.each(PRODUCTS.map((p) => [p.name, p] as const))('%s ist im geltenden Kura ohne Hinweis', (_name, product) => {
		const examples = product.examples(KURA, font);
		expect(examples.length).toBeGreaterThan(0);
		expect(examples.flatMap((e) => e.hints)).toEqual([]);
		expect(product.notes(KURA, font)).toEqual([]);
	});

	it.each(PRODUCTS.map((p) => [p.name, p] as const))('%s zeigt seine Beispiele in der Ansicht seines Mediums', (_name, product) => {
		for (const { view } of product.examples(KURA, font)) {
			expect(view.medium).toBe(product.medium.id);
			expect(view.width).toBeGreaterThan(0);
			expect(view.height).toBeGreaterThan(0);
		}
	});
});
