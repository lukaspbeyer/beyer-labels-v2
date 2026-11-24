import { describe, expect, it } from 'vitest';
import { pathBox } from '$lib/typesetting/geometry';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { KURA, maxSignWidth, parseKura, signCapHeight, type Kura } from './kura';
import values from './kura.json';
import { placeLine, roleText, setRoleLine, setSign } from './textRole';

const font = loadTestFont(KURA.typeface.font, KURA.typeface.weight);

function variant(changes: Record<string, unknown>): Kura {
	const result = parseKura({ ...values, ...changes });
	if (!result.ok) throw new Error(result.error.join('\n'));
	return result.value;
}

describe('Textrolle: Schreibweise', () => {
	it('schreibt in der Schreibweise der Rolle', () => {
		expect(roleText(KURA, 'sign', 'Gewürze')).toBe('GEWÜRZE');
		expect(roleText(KURA, 'text', 'Tee kochen')).toBe('Tee kochen');
		expect(roleText(variant({ sign: { ...values.sign, case: 'lower' } }), 'sign', 'Gewürze')).toBe('gewürze');
		expect(roleText(variant({ text: { ...values.text, case: 'upper' } }), 'text', 'Tee')).toBe('TEE');
	});
});

describe('Textrolle: Zeile', () => {
	it('beginnt mit der Kontur bei 0 und misst ihre Breite', () => {
		const line = setRoleLine(KURA, font, 'sign', 'Teller', 6);
		const box = pathBox(line.commands);
		expect(line.text).toBe('TELLER');
		expect(box.minX).toBeCloseTo(0, 9);
		expect(box.maxX).toBeCloseTo(line.width, 9);
		expect(line.hints).toEqual([]);
	});

	it('sperrt das Zeichen weiter als den Text', () => {
		expect(setRoleLine(KURA, font, 'sign', 'teller', 6).width).toBeGreaterThan(setRoleLine(KURA, font, 'text', 'teller', 6).width);
	});

	it('meldet Zeichen, die die Schrift nicht hat, einmal je Zeichen und am übergebenen Ort', () => {
		const line = setRoleLine(KURA, font, 'text', 'Tee ☕ und ☕', 3.4, ['tasks', 0, 'text']);
		expect(line.hints).toEqual([{ kind: 'character', at: ['tasks', 0, 'text'], message: '„Tee ☕ und ☕“ enthält Zeichen, die die Schrift nicht hat: ☕. Ersetzen oder weglassen.' }]);
		expect(setRoleLine(KURA, font, 'sign', 'чай', 6).hints[0].message).toContain('Ч А Й');
	});

	it('ist leer ohne Text', () => {
		expect(setRoleLine(KURA, font, 'text', '', 3.4)).toMatchObject({ commands: [], width: 0, hints: [] });
	});

	it('stellt die Zeile links, mittig oder rechts in einen Bereich', () => {
		const line = setRoleLine(KURA, font, 'text', 'tee', 3.4);
		const at = (align: 'left' | 'center' | 'right', width: number) => pathBox(placeLine(line, align, { x: 10, width }, 50).commands);
		expect(at('left', 100).minX).toBeCloseTo(10, 9);
		expect((at('center', 100).minX + at('center', 100).maxX) / 2).toBeCloseTo(60, 9);
		expect(at('right', 100).maxX).toBeCloseTo(110, 9);
		// Breite 0: die Kante, an der die Zeile rechts endet
		expect(at('right', 0).maxX).toBeCloseTo(10, 9);
		expect(at('left', 0).maxY).toBeGreaterThan(50 - 0.5);
	});
});

describe('Textrolle: Zeichen auf einer Fläche', () => {
	const surface = { x: 0, y: 0, width: 105, height: 74 };

	it('leitet die Versalhöhe aus der Fläche ab und stellt das Zeichen nach Kura', () => {
		const { lines, hints } = setSign(KURA, font, surface, { text: 'Gewürze', at: ['text'] });
		expect(hints).toEqual([]);
		expect(lines).toHaveLength(1);
		expect(lines[0].capHeight).toBeCloseTo(signCapHeight(KURA, 105, 74), 9);
		const box = pathBox(lines[0].commands);
		expect((box.minX + box.maxX) / 2).toBeCloseTo(105 / 2, 6);
		expect(box.minY).toBeLessThan(74 / 2);
		expect(box.maxY).toBeGreaterThan(74 / 2);
	});

	it('setzt die Unterzeile kleiner darunter und lässt eine leere weg', () => {
		const { lines } = setSign(KURA, font, surface, { text: 'gewürze', at: ['text'] }, { text: 'regal 2', at: ['subText'] });
		expect(lines[1].capHeight).toBeCloseTo(lines[0].capHeight * KURA.subLine.capRatio, 9);
		expect(pathBox(lines[1].commands).minY).toBeGreaterThan(pathBox(lines[0].commands).maxY);
		expect(setSign(KURA, font, surface, { text: 'gewürze', at: [] }, { text: '  ', at: [] }).lines).toHaveLength(1);
	});

	it('nimmt eine vorgegebene Versalhöhe an', () => {
		expect(setSign(KURA, font, { x: 0, y: 0, width: 90, height: 24 }, { text: 'teller', at: [] }, undefined, { capHeight: 6 }).lines[0].capHeight).toBe(6);
	});

	it('folgt neben Text der Ausrichtung der Rolle „Text“ und steht auf Wunsch oben', () => {
		const area = { x: 18, y: 18, width: 174, height: 30 };
		const { lines } = setSign(KURA, font, area, { text: 'mittwoch', at: [] }, undefined, { besideText: true, vertical: 'top' });
		expect(KURA.text.align).toBe('left');
		expect(pathBox(lines[0].commands).minX).toBeCloseTo(18, 9);
		// Grundlinie eine Versalhöhe unter der Oberkante
		const cap = signCapHeight(KURA, 174, 30);
		expect(pathBox(setSign(KURA, font, area, { text: 'H', at: [] }, undefined, { besideText: true, vertical: 'top' }).lines[0].commands).maxY).toBeCloseTo(18 + cap, 1);
	});

	it('meldet ein Wort und eine Unterzeile, die breiter sind, als Kura auf der Fläche zulässt', () => {
		const limit = maxSignWidth(KURA, 105);
		const { lines, hints } = setSign(KURA, font, surface, { text: 'weihnachtsdekoration', at: ['labels', 2, 'text'] }, { text: 'eine viel zu lange unterzeile für dieses etikett', at: ['labels', 2, 'subText'] });
		expect(lines[0].width).toBeGreaterThan(limit);
		expect(hints.map((h) => [h.kind, h.at])).toEqual([
			['sign-width', ['labels', 2, 'text']],
			['sub-width', ['labels', 2, 'subText']]
		]);
		expect(hints[0].message).toMatch(/^Das Wort ist [\d,]+ mm breit, Kura lässt auf diesem Format höchstens 73,8 mm zu\./);
	});

	it('meldet Zeichen ohne Glyphe vor der Breite', () => {
		const { hints } = setSign(KURA, font, { x: 0, y: 0, width: 64, height: 24 }, { text: 'tee☕', at: ['text'] }, undefined, { capHeight: 6 });
		expect(hints.map((h) => h.kind)).toEqual(['character']);
	});
});
