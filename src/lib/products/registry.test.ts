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

	it('jedes Beispiel ist eine maßstäbliche Zeichnung', () => {
		for (const example of PRODUCTS.flatMap((p) => p.examples(KURA, font))) {
			expect(example.svg).toContain(`viewBox="0 0 ${example.width} ${example.height}"`);
		}
	});
});
