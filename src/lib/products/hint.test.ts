import { describe, expect, it } from 'vitest';
import { fieldPath, hint, hintText, within } from './hint';

describe('Hinweis', () => {
	it('schreibt den Ort als Feldpfad, Stellen in eckigen Klammern', () => {
		expect(fieldPath(['days', 1, 'tasks', 0, 'text'])).toBe('days[1].tasks[0].text');
		expect(fieldPath(['routines', 'morning', 2])).toBe('routines.morning[2]');
		expect(fieldPath([])).toBe('');
	});

	it('setzt den Feldpfad vor den Text und lässt ihn ohne Ort weg', () => {
		expect(hintText(hint('empty', 'Das Wort fehlt.', ['text']))).toBe('text: Das Wort fehlt.');
		expect(hintText(hint('overflow', 'Das Blatt ist zu lang.'))).toBe('Das Blatt ist zu lang.');
	});

	it('setzt Hinweise eines Teils an ihren Ort im Ganzen, auch solche ohne eigenes Feld', () => {
		const nested = within(['days', 1], [hint('date', 'Datum angeben.', ['date']), hint('overflow', 'Das Blatt ist zu lang.')]);
		expect(nested.map(hintText)).toEqual(['days[1].date: Datum angeben.', 'days[1]: Das Blatt ist zu lang.']);
	});
});
