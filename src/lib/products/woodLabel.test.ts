import { describe, expect, it } from 'vitest';
import { KURA, parseKura } from '$lib/kura/kura';
import kuraValues from '$lib/kura/kura.json';
import { VOCABULARY } from '$lib/kura/vocabulary';
import { layoutLabel } from '$lib/media/wood/layout';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { checkWoodLabel, DEFAULT_WOOD_LABEL_INPUT, vocabularyMisfits, woodLabelSettings, type WoodLabelInput } from './woodLabel';

function check(input: Partial<WoodLabelInput>, kura = KURA) {
	const settings = woodLabelSettings(kura, { ...DEFAULT_WOOD_LABEL_INPUT, ...input });
	const layout = layoutLabel(settings, loadTestFont(settings.font, settings.weight));
	return { settings, layout, warnings: checkWoodLabel(kura, layout, settings) };
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
		expect(check({ text: 'servietten' }).warnings.map((w) => w.kind)).toContain('sign-width');
		const long = check({ text: 'servietten', format: 'long' });
		expect([long.layout.width, long.layout.height]).toEqual([90, 24]);
		expect(long.settings.capHeight).toBe(6);
		expect(long.warnings).toEqual([]);
	});

	it('folgt einer Änderung an Kura, ohne dass das Produkt etwas festschreibt', () => {
		const changed = parseKura({ ...kuraValues, typeface: { font: 'sora', weight: 500 }, sign: { ...kuraValues.sign, trackingPercent: 10 } });
		if (!changed.ok) throw new Error(changed.error.join('\n'));
		expect(check({}, changed.value).settings).toMatchObject({ font: 'sora', weight: 500, tracking: 10 });
	});
});
