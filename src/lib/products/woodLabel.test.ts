import { describe, expect, it } from 'vitest';
import { KURA, parseKura } from '$lib/kura/kura';
import kuraValues from '$lib/kura/kura.json';
import { VOCABULARY } from '$lib/kura/vocabulary';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { DEFAULT_WOOD_LABEL_INPUT, vocabularyMisfits, woodLabel, type WoodLabelInput } from './woodLabel';

function check(input: Partial<WoodLabelInput>, kura = KURA) {
	const proof = woodLabel.set(kura, { labels: [{ ...DEFAULT_WOOD_LABEL_INPUT, ...input }] }, loadTestFont(kura.typeface.font, kura.typeface.weight));
	return { ...proof.labels[0], proof };
}

describe('Holzlabel', () => {
	it('leitet die Kura-Spezifikation ab', () => {
		const { settings, layout } = check({});
		expect([layout.width, layout.height]).toEqual([64, 24]);
		expect(settings).toMatchObject({ font: 'jost', weight: 400, capHeight: 6, tracking: 22, process: 'fill', fillColor: 'black', edge: 'sanded', subText: '' });
	});

	it('der ganze Wortschatz passt ohne Hinweis ins Serienformat', () => {
		expect(VOCABULARY.length).toBeGreaterThan(60);
		expect(vocabularyMisfits(KURA, loadTestFont(KURA.typeface.font, KURA.typeface.weight))).toEqual([]);
	});

	it('schreibt das Wort klein, auch wenn es groß eingegeben wird', () => {
		expect(check({ text: 'Teller' }).settings.text).toBe('teller');
	});

	it('meldet ein zu breites Wort und nimmt es im Langformat an', () => {
		expect(check({ text: 'servietten' }).hints.map((h) => h.kind)).toContain('sign-width');
		const long = check({ text: 'servietten', format: 'long' });
		expect([long.layout.width, long.layout.height]).toEqual([90, 24]);
		expect(long.settings.capHeight).toBe(6);
		expect(long.hints).toEqual([]);
	});

	it('meldet fehlendes Wort und unbekanntes Format zugleich', async () => {
		const made = await woodLabel.make(KURA, { format: 'riesig' }, loadTestFont(KURA.typeface.font, KURA.typeface.weight));
		expect(!made.ok && made.error.map((h) => [h.kind, h.at])).toEqual([
			['empty', ['text']],
			['choice', ['format']]
		]);
	});

	it('nennt Agenten die Breite des Wortes aus Kura', () => {
		expect(woodLabel.spec(KURA).fields[0].description).toContain('höchstens 45 mm');
		const narrow = parseKura({ ...kuraValues, proportion: { ...kuraValues.proportion, maxSignWidthRatio: 0.5 } });
		if (!narrow.ok) throw new Error(narrow.error.join('\n'));
		expect(woodLabel.spec(narrow.value).fields[0].description).toContain('höchstens 32 mm');
	});

	it('folgt einer Änderung an Kura, ohne dass das Produkt etwas festschreibt', () => {
		const changed = parseKura({ ...kuraValues, typeface: { font: 'sora', weight: 500 }, sign: { ...kuraValues.sign, trackingPercent: 10 } });
		if (!changed.ok) throw new Error(changed.error.join('\n'));
		expect(check({}, changed.value).settings).toMatchObject({ font: 'sora', weight: 500, tracking: 10 });
	});
});
