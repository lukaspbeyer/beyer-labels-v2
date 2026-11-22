import { describe, expect, it } from 'vitest';
import { KURA, parseKura } from '$lib/kura/kura';
import kuraValues from '$lib/kura/kura.json';
import { layoutLabel } from '$lib/media/wood/layout';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { checkWoodLabel, DEFAULT_WOOD_LABEL_INPUT, woodLabelSettings, type WoodLabelInput } from './woodLabel';

/** Wortschatz aus BEYER-DESIGN-GUIDELINES.md, Abschnitt „Hausdesign Kura“ */
const VOCABULARY = [
	'teller', 'schalen', 'tassen', 'gläser', 'besteck', 'töpfe', 'pfannen', 'deckel', 'backen', 'bretter', 'messer', 'geräte',
	'vorrat', 'gewürze', 'öle', 'tee', 'kaffee', 'müsli', 'nudeln', 'reis', 'mehl', 'zucker', 'brot', 'snacks', 'dosen', 'folien',
	'tücher', 'putzen', 'müll', 'lappen', 'zähne', 'haare', 'pflege', 'kosmetik', 'rasur', 'seife', 'duschgel', 'shampoo', 'föhn',
	'medizin', 'pflaster', 'papier', 'bürsten', 'wäsche', 'bettzeug', 'decken', 'kissen', 'socken', 'pyjamas', 'pullover', 'shirts',
	'hosen', 'hemden', 'schals', 'mützen', 'gürtel', 'schmuck', 'uhren', 'schuhe', 'sport', 'bücher', 'papiere', 'kabel', 'koffer',
	'winter', 'sommer'
];

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

	it.each(VOCABULARY)('„%s“ passt ohne Hinweis ins Serienformat', (text) => {
		expect(check({ text }).warnings).toEqual([]);
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
