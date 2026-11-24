import { describe, expect, it } from 'vitest';
import values from './kura.json';
import { caseInWords, KURA, KURA_OPTION_NAMES, KURA_OPTIONS, kuraChanges, kuraChoices, maxSignWidth, parseKura, signCapHeight, type KuraOption } from './kura';

describe('Kura', () => {
	it('kura.json ist gültig', () => {
		expect(parseKura(values).ok).toBe(true);
	});

	it('nennt alle Verstöße einer ungültigen Definition', () => {
		const result = parseKura({ ...values, typeface: { font: 'sora', weight: 700 }, sign: { ...values.sign, case: 'bunt', trackingPercent: 90 } });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.map((p) => p.split(':')[0])).toEqual(['sign.case', 'sign.trackingPercent', 'typeface.weight']);
	});

	it('leitet die Versalhöhe aus der Breite ab, begrenzt durch die Höhe', () => {
		expect(signCapHeight(KURA, 64, 24)).toBe(6);
		expect(signCapHeight(KURA, 90, 24)).toBe(6);
		expect(signCapHeight(KURA, 105, 74)).toBeCloseTo(9.84, 2);
		expect(signCapHeight(KURA, 210, 100)).toBeCloseTo(19.69, 2);
	});

	it('verlangt Druck- und Signalfarbe als #rrggbb', () => {
		const result = parseKura({ ...values, paper: { ...values.paper, signal: 'rot' } });
		expect(!result.ok && result.error).toEqual(['paper.signal: Farbe als #rrggbb erwartet']);
	});

	it('lässt dem Zeichen höchstens 45 mm auf 64 mm Breite', () => {
		expect(maxSignWidth(KURA, 64)).toBe(45);
	});

	it('nennt die Änderungen einer Arbeitskopie mit Pfad, altem und neuem Wert', () => {
		expect(kuraChanges(values, values)).toEqual([]);
		const draft = { ...values, typeface: { ...values.typeface, weight: 500 }, paper: { ...values.paper, ink: '#222222' } };
		expect(kuraChanges(values, draft)).toEqual([`typeface.weight: ${values.typeface.weight} → 500`, `paper.ink: ${values.paper.ink} → #222222`]);
	});

	it('nennt jedes Auswahlfeld und jeden zulässigen Wert genau einmal', () => {
		const paths = Object.keys(KURA_OPTIONS) as KuraOption[];
		expect(Object.keys(KURA_OPTION_NAMES).sort()).toEqual([...paths].sort());
		for (const path of paths) {
			const { title, values } = KURA_OPTION_NAMES[path];
			expect(title.trim(), path).not.toBe('');
			expect(Object.keys(values).sort(), path).toEqual([...KURA_OPTIONS[path]].sort());
			const names = Object.values(values) as string[];
			expect(names.every((name) => name.trim() !== ''), path).toBe(true);
			expect(new Set(names).size, path).toBe(names.length);
		}
	});

	it('bietet die Werte eines Auswahlfelds in der Reihenfolge der Definition mit Namen an', () => {
		expect(kuraChoices('wood.finish')).toEqual([
			{ value: 'raw', label: 'Roh' },
			{ value: 'oiled', label: 'Geölt' },
			{ value: 'lacquer', label: 'Lack matt' },
			{ value: 'limed', label: 'Weiß gekalkt' }
		]);
	});

	it('beschreibt die Schreibweise in Worten', () => {
		expect(caseInWords('lower')).toBe('klein');
		expect(caseInWords('upper')).toBe('groß');
		expect(caseInWords('as-typed')).toBe('wie eingegeben');
	});
});
