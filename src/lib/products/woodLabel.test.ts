import { describe, expect, it } from 'vitest';
import { KURA, parseKura } from '$lib/kura/kura';
import kuraValues from '$lib/kura/kura.json';
import { VOCABULARY } from '$lib/kura/vocabulary';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { DEFAULT_WOOD_SURROUNDINGS, frontColor } from '$lib/media/wood/surroundings';
import { DEFAULT_WOOD_LABEL_INPUT, vocabularyMisfits, woodLabel, type WoodLabelInput } from './woodLabel';

function check(input: Partial<WoodLabelInput>, kura = KURA) {
	const proof = woodLabel.set(kura, { labels: [{ ...DEFAULT_WOOD_LABEL_INPUT, ...input }] }, loadTestFont(kura.typeface.font, kura.typeface.weight));
	return { ...proof.labels[0], proof };
}

describe('Holzlabel', () => {
	it('leitet die Kura-Spezifikation ab', () => {
		const { engraving, layout } = check({});
		expect([layout.width, layout.height]).toEqual([64, 24]);
		expect(engraving).toMatchObject({ font: 'inter-tight', weight: 400, tracking: 8, process: 'fill', fillColor: 'black', edge: 'sanded', subText: '' });
		expect(engraving.capHeight).toBeCloseTo(4.8, 9);
	});

	it('der ganze Wortschatz passt ohne Hinweis ins Serienformat', () => {
		expect(VOCABULARY.length).toBeGreaterThan(60);
		expect(vocabularyMisfits(KURA, loadTestFont(KURA.typeface.font, KURA.typeface.weight))).toEqual([]);
	});

	it('schreibt das Wort in Versalien, wie auch immer es eingegeben wird', () => {
		expect(check({ text: 'Teller' }).engraving.text).toBe('TELLER');
	});

	it('meldet ein zu breites Wort und nimmt es im Langformat an', () => {
		expect(check({ text: 'weihnachten' }).hints.map((h) => h.kind)).toContain('sign-width');
		const long = check({ text: 'weihnachten', format: 'long' });
		expect([long.layout.width, long.layout.height]).toEqual([90, 24]);
		// dieselbe Schrift wie das Serienformat
		expect(long.engraving.capHeight).toBeCloseTo(4.8, 9);
		expect(long.hints).toEqual([]);
	});

	it('benennt die Datei nach Wort und Format und liefert die Laser-SVG über das Medium', async () => {
		const { proof } = check({ text: 'Gewürze & Öle', format: 'long' });
		expect(proof.fileName).toBe('holzlabel-gewuerze-oele-90x24mm.svg');
		expect(await proof.file()).toMatchObject({ fileName: proof.fileName, mime: 'image/svg+xml' });
	});

	it('gibt der Laserdatei den Titel des Produkts mit allen Wörtern, wie Kura sie schreibt', async () => {
		const font = loadTestFont(KURA.typeface.font, KURA.typeface.weight);
		const proof = woodLabel.set(KURA, { labels: [{ text: ' Teller ', format: 'series' }, { text: 'öl & co', format: 'series' }] }, font);
		expect(String((await proof.file()).body)).toContain('<title>Holzlabel TELLER, ÖL &amp; CO</title>');
	});

	it('zeigt die Beispiele vor der Front, aus demselben Satz wie eine Bestellung', () => {
		const font = loadTestFont(KURA.typeface.font, KURA.typeface.weight);
		const examples = woodLabel.examples(KURA, font);
		const { layout, engraving } = check({ text: 'teller' });
		expect(examples[0].view).toMatchObject({ medium: 'wood', width: 64, height: 24, layout, engraving, backdrop: frontColor(DEFAULT_WOOD_SURROUNDINGS.front) });
		// Umgebung der Vorschau, nicht Teil der Bestellung: je Beispiel ein anderer Holzausschnitt
		expect(examples.map((e) => (e.view.medium === 'wood' ? e.view.surroundings.grainSeed : null))).toEqual([1, 2, 3]);
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
		expect(check({}, changed.value).engraving).toMatchObject({ font: 'sora', weight: 500, tracking: 10 });
	});
});
