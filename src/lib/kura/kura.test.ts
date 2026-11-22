import { describe, expect, it } from 'vitest';
import values from './kura.json';
import { applyCase, KURA, maxSignWidth, parseKura, signCapHeight } from './kura';

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

	it('lässt dem Zeichen höchstens 45 mm auf 64 mm Breite', () => {
		expect(maxSignWidth(KURA, 64)).toBe(45);
	});

	it('schreibt klein', () => {
		expect(applyCase(KURA.sign.case, 'Gewürze')).toBe('gewürze');
	});
});
