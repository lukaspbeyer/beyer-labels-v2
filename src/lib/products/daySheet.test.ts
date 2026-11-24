import { describe, expect, it } from 'vitest';
import { KURA } from '$lib/kura/kura';
import { pathBox } from '$lib/typesetting/geometry';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { DAY_SHEET_EXAMPLE, daySheet, entryLine, layoutDaySheet, parseDaySheet, type DaySheetInput } from './daySheet';
import { hintText } from './hint';

const font = loadTestFont(KURA.typeface.font, KURA.typeface.weight);

function sheet(changes: Partial<DaySheetInput> = {}) {
	return layoutDaySheet(KURA, { ...DAY_SHEET_EXAMPLE, ...changes }, font);
}

describe('Tagesübersicht: Inhalt prüfen', () => {
	it('nimmt das Beispiel an', () => {
		const result = parseDaySheet(DAY_SHEET_EXAMPLE);
		expect(result.ok && result.value).toEqual(DAY_SHEET_EXAMPLE);
	});

	it('meldet alle Überschreitungen der Obergrenzen auf einmal', () => {
		const result = parseDaySheet({
			...DAY_SHEET_EXAMPLE,
			routines: { morning: ['a', 'b', 'c', 'd', 'e'], midday: [], evening: [] },
			tasks: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
			appointments: [1, 2, 3, 4, 5].map((n) => ({ time: `1${n}:00`, text: `Termin ${n}` })),
			remember: ['a', 'b', 'c', 'd']
		});
		expect(!result.ok && result.error.map((h) => h.kind)).toEqual(['too-many', 'too-many', 'too-many', 'too-many']);
	});

	it('meldet ein falsches Datum und falsche Uhrzeiten', () => {
		const result = parseDaySheet({ ...DAY_SHEET_EXAMPLE, date: '26.11.2026', appointments: [{ time: '9 Uhr', text: 'Zahnärztin', leaveAt: 'bald' }] });
		expect(!result.ok && result.error.map((h) => h.kind)).toEqual(['date', 'time', 'time']);
	});

	it('nimmt einen fast leeren Tag an und lässt Fehlendes leer', () => {
		const result = parseDaySheet({ date: '2026-11-27' });
		expect(result.ok && result.value).toEqual({
			date: '2026-11-27',
			focus: { text: '', firstStep: '' },
			routines: { morning: [], midday: [], evening: [] },
			tasks: [],
			appointments: [],
			remember: []
		});
	});
});

describe('Tagesübersicht: Blatt', () => {
	it('ist im geltenden Kura ohne Hinweis und bleibt innerhalb der Ränder', () => {
		const { page, hints } = sheet();
		expect(hints).toEqual([]);
		expect([page.width, page.height]).toEqual([210, 297]);
		for (const item of page.items) {
			const box = pathBox(item.commands);
			expect(box.minX).toBeGreaterThanOrEqual(18 - 1e-6);
			expect(box.maxX).toBeLessThanOrEqual(192 + 1e-6);
			// Rundungen der Tageszahl ragen knapp über die Versalhöhe
			expect(box.minY).toBeGreaterThanOrEqual(17);
			expect(box.maxY).toBeLessThanOrEqual(279 + 1e-6);
		}
	});

	it('trägt den Tag in einer großen Zahl, Wochentag, Monat und Kalenderwoche daneben', () => {
		const { page } = sheet();
		const boxes = page.items.filter((i) => i.kind === 'fill').map((i) => pathBox(i.commands));
		const tallest = boxes.reduce((a, b) => (b.maxY - b.minY > a.maxY - a.minY ? b : a));
		// die Tageszahl hat das 10-fache der Lesegröße als Versalhöhe; Rundungen ragen etwas darüber und darunter
		expect(tallest.maxY - tallest.minY).toBeGreaterThan(KURA.paper.textCapHeight * 10 - 1e-6);
		expect(tallest.maxY - tallest.minY).toBeLessThan(KURA.paper.textCapHeight * 10 * 1.05);
		expect(tallest.minX).toBeCloseTo(18, 0);
	});

	it('lässt allen Text an einer Fluchtlinie beginnen; Kästchen und Uhrzeiten hängen davor', () => {
		const { page } = sheet();
		const line = entryLine(KURA, font);
		const gap = KURA.paper.textCapHeight * 0.9;
		const headerRule = page.items.find((i) => i.kind === 'stroke' && i.commands.length === 2);
		if (!headerRule) throw new Error('Linie unter dem Kopf fehlt');
		const body = page.items.filter((i) => pathBox(i.commands).minY > pathBox(headerRule.commands).minY);
		const fills = body.filter((i) => i.kind === 'fill').map((i) => pathBox(i.commands));
		// links der Fluchtlinie steht an Text nur die Uhrzeit, sie endet einen Abstand davor
		for (const box of fills.filter((b) => b.minX < line - 1e-6)) expect(box.maxX).toBeCloseTo(line - gap, 6);
		// sechs Überschriften (mit „erster schritt“), die Hauptsache, drei Routinen der ersten Spalte, drei Aufgaben, zwei Termine, Mitnehmen
		expect(fills.filter((b) => Math.abs(b.minX - line) < 1e-6)).toHaveLength(16);
		// jedes Kästchen der ersten Spalte endet einen Abstand vor der Fluchtlinie
		const boxes = body.filter((i) => i.kind === 'stroke' && i.commands.length > 2).map((i) => pathBox(i.commands));
		const firstColumn = boxes.filter((b) => b.maxX < line);
		// Hauptsache, drei Routinen am Morgen, drei Aufgaben
		expect(firstColumn).toHaveLength(1 + 3 + 3);
		for (const box of firstColumn) expect(box.maxX).toBeCloseTo(line - gap, 6);
	});

	it('hebt „heute wichtig“ mit Überschrift und Kästchen in der Signalfarbe hervor, die Sache selbst bleibt in der Druckfarbe', () => {
		const signal = sheet().page.items.filter((i) => i.tone === 'signal');
		expect(signal.map((i) => i.kind)).toEqual(['fill', 'stroke']);
		// das Kästchen wächst mit der Zeile der Hauptsache
		const box = pathBox(signal[1].commands);
		expect(box.maxX - box.minX).toBeCloseTo(KURA.paper.textCapHeight * 1.55 * 1.1, 6);
		const plain = sheet({ focus: { text: '', firstStep: '' } }).page.items.filter((i) => i.tone === 'signal');
		expect(plain).toHaveLength(2);
	});

	it('hat immer dieselben Plätze, auch an einem leeren Tag', () => {
		const empty = parseDaySheet({ date: '2026-11-27' });
		if (!empty.ok) throw new Error('leerer Tag abgelehnt');
		const strokes = (input: DaySheetInput) => layoutDaySheet(KURA, input, font).page.items.filter((i) => i.kind === 'stroke' && i.commands.length === 2);
		const lines = (input: DaySheetInput) => strokes(input).map((i) => i.commands[0]);
		expect(lines(empty.value)).toEqual(lines(DAY_SHEET_EXAMPLE));
	});

	it('meldet einen zu langen Eintrag statt ihn umzubrechen', () => {
		const { hints } = sheet({ routines: { ...DAY_SHEET_EXAMPLE.routines, morning: ['Frühstück für alle vorbereiten und den Tisch decken'] } });
		expect(hints.map((h) => h.kind)).toEqual(['too-long']);
		expect(hints[0].at).toEqual(['routines', 'morning', 0]);
	});

	it('meldet Zeichen, die die Schrift nicht hat', () => {
		expect(sheet({ remember: ['Schlüssel 🔑'] }).hints.map((h) => [h.kind, h.at])).toEqual([['character', ['remember']]]);
	});

	it('nennt bei mehreren Tagen den Tag vor dem Feld, auch bei Zeichen ohne Glyphe', async () => {
		const made = await daySheet.make(KURA, { days: [DAY_SHEET_EXAMPLE, { ...DAY_SHEET_EXAMPLE, date: '2026-11-27', remember: ['Schlüssel 🔑'] }] }, font);
		expect(!made.ok && made.error.map(hintText)).toEqual(['days[1].remember: „Schlüssel 🔑“ enthält Zeichen, die die Schrift nicht hat: 🔑. Ersetzen oder weglassen.']);
	});

	it('benennt die Datei nach dem Tag', () => {
		expect(daySheet.set(KURA, { days: [DAY_SHEET_EXAMPLE] }, font).fileName).toBe('tagesuebersicht-2026-11-26.pdf');
	});
});
