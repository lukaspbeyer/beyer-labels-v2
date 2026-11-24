/**
 * PROTOTYP, zum Wegwerfen: drei Ordnungen der Fluchtlinien für die Tagesübersicht, zum Vergleich mit dem Produkt.
 * Kopf, Zonen, Inhalte, Obergrenzen und Kura bleiben wie im Produkt (daySheet.ts); anders ist nur,
 * an welcher Fluchtlinie was steht und wie groß. Nichts außer dem Export für den Vergleich liest dieses Modul.
 *
 *   A „Eine Fluchtlinie“: aller Text beginnt an einer Linie, Kästchen und Uhrzeiten hängen links davor.
 *   B „Zwei Fluchtlinien“: links Überschriften, Kästchen und Uhrzeiten, rechts daneben jeder Eintrag.
 *   C „Randspalte“: Überschriften stehen links neben ihren Einträgen, Inhalt rechts.
 */
import type { Kura } from '$lib/kura/kura';
import { placeLine, setRoleLine } from '$lib/kura/textRole';
import type { PrintItem, PrintPage, PrintTone } from '$lib/media/paper/page';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { formatMm } from '$lib/typesetting/format';
import { roundedRectPath } from '$lib/typesetting/geometry';
import type { PathCommand } from '$lib/typesetting/types';
import { DAY_SHEET_LIMITS, ROUTINE_BLOCKS, type DaySheetInput } from './daySheet';
import { hint, type Hint } from './hint';

const SHEET = { width: 210, height: 297, margin: 18 } as const;
const LEFT = SHEET.margin;
const RIGHT = SHEET.width - SHEET.margin;

function isoWeek(day: Date): number {
	const thursday = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
	thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
	return Math.ceil(((thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}

/** Werkzeuge eines Blatts: setzen, messen, Linien, Kästchen, Kopf. Maße als Vielfache der Lesegröße wie im Produkt. */
function sheet(kura: Kura, font: LoadedFont) {
	const items: PrintItem[] = [];
	const hints: Hint[] = [];
	const cap = kura.paper.textCapHeight;
	const m = {
		cap,
		headingCap: cap * 0.72,
		focusCap: cap * 1.55,
		row: cap * 2.75,
		focusRow: cap * 3.7,
		zoneGap: cap * 2.5,
		headingGap: cap * 1.25,
		gap: cap * 0.9,
		box: cap * 1.25
	};

	function width(text: string, role: 'sign' | 'text', capHeight: number): number {
		return setRoleLine(kura, font, role, text, capHeight).width;
	}

	function put(text: string, role: 'sign' | 'text', capHeight: number, x: number, baseline: number, at: Hint['at'] = [], side: 'left' | 'right' = 'left', tone?: PrintTone): number {
		if (!text) return 0;
		const set = setRoleLine(kura, font, role, text, capHeight, at);
		hints.push(...set.hints);
		if (set.width === 0) return 0;
		items.push({ kind: 'fill', commands: placeLine(set, side, { x, width: 0 }, baseline).commands, tone });
		return set.width;
	}

	function entry(text: string, capHeight: number, x: number, baseline: number, available: number, at: Hint['at']): void {
		const used = put(text, 'text', capHeight, x, baseline, at);
		if (used > available + 1e-6) hints.push(hint('too-long', `„${text}“ ist ${formatMm(used)} mm breit, Platz sind ${formatMm(available)} mm.`, at));
	}

	function line(x1: number, x2: number, y: number): void {
		const commands: PathCommand[] = [
			{ type: 'M', x: x1, y },
			{ type: 'L', x: x2, y }
		];
		items.push({ kind: 'stroke', commands, widthMm: kura.paper.ruleWidth });
	}

	/** Kästchen der Kantenlänge `size` mit linker Kante `x`, senkrecht mittig zur Versalhöhe der Zeile. */
	function box(x: number, baseline: number, rowCap: number, size = m.box, tone?: PrintTone, weight = 1): void {
		items.push({ kind: 'stroke', commands: roundedRectPath(x, baseline - rowCap / 2 - size / 2, size, size, 0), widthMm: kura.paper.ruleWidth * weight, tone });
	}

	/** Kopf wie im Produkt; liefert die Höhe der Linie darunter. */
	function header(input: DaySheetInput): number {
		const day = new Date(`${input.date}T00:00:00Z`);
		const dayCap = cap * 10;
		const dateCap = cap * 1.15;
		const baseline = SHEET.margin + dayCap;
		const dateLeft = LEFT + put(String(day.getUTCDate()), 'text', dayCap, LEFT, baseline, ['date']) + cap * 2.2;
		put(new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(day), 'text', dateCap, dateLeft, baseline, ['date']);
		put(new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: 'UTC' }).format(day), 'sign', dateCap, dateLeft, baseline - dateCap - cap * 1.1, ['date']);
		put(`KW ${isoWeek(day)}`, 'text', dateCap, RIGHT, SHEET.margin + dateCap, ['date'], 'right');
		const ruleY = baseline + cap * 2.2;
		line(LEFT, RIGHT, ruleY);
		return ruleY;
	}

	function finish(y: number): { page: PrintPage; hints: Hint[] } {
		if (y > SHEET.height - SHEET.margin + 1e-6) hints.push(hint('overflow', `Das Blatt ist ${formatMm(y - (SHEET.height - SHEET.margin))} mm zu lang.`));
		return { page: { width: SHEET.width, height: SHEET.height, items }, hints };
	}

	return { m, width, put, entry, line, box, header, finish };
}

/** Routinen in drei Spalten; in jeder Spalte hängt das Kästchen vor dem Text, die Überschrift steht über dem Text. */
function routines(s: ReturnType<typeof sheet>, input: DaySheetInput, top: number, firstText: number, span: { from: number; to: number }): number {
	const { m } = s;
	const columnGap = m.cap * 1.5;
	const mark = m.box + m.gap;
	const column = (span.to - span.from - 2 * columnGap) / 3;
	ROUTINE_BLOCKS.forEach(({ id, name }, c) => {
		const text = c === 0 ? firstText : span.from + c * (column + columnGap) + mark;
		s.put(name, 'sign', m.headingCap, text, top + m.headingCap);
		let rowY = top + m.headingCap + m.headingGap;
		input.routines[id].slice(0, DAY_SHEET_LIMITS.routinesPerBlock).forEach((entryText, i) => {
			const baseline = rowY + m.row - m.cap * 0.9;
			s.box(text - mark, baseline, m.cap);
			s.entry(entryText, m.cap, text, baseline, span.from + (c + 1) * column + c * columnGap - text, ['routines', id, i]);
			rowY += m.row;
		});
	});
	return top + m.headingCap + m.headingGap + DAY_SHEET_LIMITS.routinesPerBlock * m.row;
}

/** A „Eine Fluchtlinie“: Überschriften und aller Text an der Linie T; Kästchen und Uhrzeiten hängen links davor. */
export function layoutLine(kura: Kura, input: DaySheetInput, font: LoadedFont) {
	const s = sheet(kura, font);
	const { m } = s;
	const T = LEFT + s.width('00:00', 'text', m.cap) + m.gap;
	const heading = (text: string, y: number, tone?: PrintTone) => (s.put(text, 'sign', m.headingCap, T, y + m.headingCap, [], 'left', tone), y + m.headingCap + m.headingGap);
	let y = s.header(input) + m.zoneGap;

	// Hauptsache; das Kästchen wächst mit der Zeile, der erste Schritt ist ihre Unterzeile mit kleiner Beschriftung
	y = heading('heute wichtig', y, 'signal');
	const focusBox = m.focusCap * 1.1;
	const focusBaseline = y + m.focusRow - m.focusCap * 0.9;
	s.box(T - m.gap - focusBox, focusBaseline, m.focusCap, focusBox, 'signal', 2);
	s.entry(input.focus.text, m.focusCap, T, focusBaseline, RIGHT - T, ['focus', 'text']);
	const stepBaseline = focusBaseline + m.row;
	const label = s.put('erster schritt', 'sign', m.headingCap, T, stepBaseline) + m.gap;
	s.entry(input.focus.firstStep, m.cap, T + label, stepBaseline, RIGHT - T - label, ['focus', 'firstStep']);
	y = stepBaseline + m.cap * 0.9 + m.gap;
	s.line(LEFT, RIGHT, y);
	y += m.zoneGap;

	y = routines(s, input, y, T, { from: T - m.box - m.gap, to: RIGHT }) + m.zoneGap;

	y = heading('außerdem', y);
	for (let i = 0; i < DAY_SHEET_LIMITS.tasks; i++) {
		const task = input.tasks[i];
		const baseline = y + m.row - m.cap * 0.9;
		s.box(T - m.gap - m.box, baseline, m.cap);
		const duration = task?.minutes ? s.put(`${task.minutes} min`, 'text', m.cap, RIGHT, baseline, ['tasks', i, 'minutes'], 'right') + m.cap * 1.5 : 0;
		if (task) s.entry(task.text, m.cap, T, baseline, RIGHT - T - duration, ['tasks', i, 'text']);
		s.line(LEFT, RIGHT, y + m.row);
		y += m.row;
	}
	y += m.zoneGap;

	y = heading('termine', y);
	for (let i = 0; i < DAY_SHEET_LIMITS.appointments; i++) {
		const a = input.appointments[i];
		const baseline = y + m.row - m.cap * 0.9;
		if (a) {
			s.put(a.time, 'text', m.cap, T - m.gap, baseline, ['appointments', i, 'time'], 'right');
			const leave = a.leaveAt ? s.put(`los ${a.leaveAt}`, 'text', m.cap, RIGHT, baseline, ['appointments', i, 'leaveAt'], 'right') + m.cap * 1.5 : 0;
			s.entry(a.text, m.cap, T, baseline, RIGHT - T - leave, ['appointments', i, 'text']);
		}
		s.line(LEFT, RIGHT, y + m.row);
		y += m.row;
	}
	y += m.zoneGap;

	y = heading('mitnehmen', y);
	s.entry(input.remember.join(' · '), m.cap, T, y + m.row - m.cap * 0.9, RIGHT - T, ['remember']);
	s.line(LEFT, RIGHT, y + m.row);
	return s.finish(y + m.row);
}

/** B „Zwei Fluchtlinien“: an der linken Linie Überschriften, Kästchen und Uhrzeiten; an der zweiten jeder Eintrag, auch Termine und Mitnehmen. */
export function layoutTwoLines(kura: Kura, input: DaySheetInput, font: LoadedFont) {
	const s = sheet(kura, font);
	const { m } = s;
	const L2 = LEFT + s.width('00:00', 'text', m.cap) + m.gap;
	const heading = (text: string, x: number, y: number, tone?: PrintTone) => (s.put(text, 'sign', m.headingCap, x, y + m.headingCap, [], 'left', tone), y + m.headingCap + m.headingGap);
	let y = s.header(input) + m.zoneGap;

	y = heading('heute wichtig', LEFT, y, 'signal');
	const focusBox = m.focusCap * 1.1;
	const focusBaseline = y + m.focusRow - m.focusCap * 0.9;
	s.box(LEFT, focusBaseline, m.focusCap, focusBox, 'signal', 2);
	s.entry(input.focus.text, m.focusCap, L2, focusBaseline, RIGHT - L2, ['focus', 'text']);
	// erster Schritt: kleine Überschrift und Eintrag an der zweiten Linie, ohne eigene Linie
	const stepHeading = focusBaseline + m.cap * 0.9 + m.headingGap * 0.8;
	s.put('erster schritt', 'sign', m.headingCap, L2, stepHeading + m.headingCap);
	const stepBaseline = stepHeading + m.headingCap + m.headingGap + m.cap;
	s.entry(input.focus.firstStep, m.cap, L2, stepBaseline, RIGHT - L2, ['focus', 'firstStep']);
	y = stepBaseline + m.cap * 0.9 + m.gap;
	s.line(LEFT, RIGHT, y);
	y += m.zoneGap;

	y = routines(s, input, y, L2, { from: L2 - m.box - m.gap, to: RIGHT }) + m.zoneGap;

	y = heading('außerdem', LEFT, y);
	for (let i = 0; i < DAY_SHEET_LIMITS.tasks; i++) {
		const task = input.tasks[i];
		const baseline = y + m.row - m.cap * 0.9;
		s.box(LEFT, baseline, m.cap);
		const duration = task?.minutes ? s.put(`${task.minutes} min`, 'text', m.cap, RIGHT, baseline, ['tasks', i, 'minutes'], 'right') + m.cap * 1.5 : 0;
		if (task) s.entry(task.text, m.cap, L2, baseline, RIGHT - L2 - duration, ['tasks', i, 'text']);
		s.line(LEFT, RIGHT, y + m.row);
		y += m.row;
	}
	y += m.zoneGap;

	y = heading('termine', LEFT, y);
	for (let i = 0; i < DAY_SHEET_LIMITS.appointments; i++) {
		const a = input.appointments[i];
		const baseline = y + m.row - m.cap * 0.9;
		if (a) {
			s.put(a.time, 'text', m.cap, LEFT, baseline, ['appointments', i, 'time']);
			const leave = a.leaveAt ? s.put(`los ${a.leaveAt}`, 'text', m.cap, RIGHT, baseline, ['appointments', i, 'leaveAt'], 'right') + m.cap * 1.5 : 0;
			s.entry(a.text, m.cap, L2, baseline, RIGHT - L2 - leave, ['appointments', i, 'text']);
		}
		s.line(LEFT, RIGHT, y + m.row);
		y += m.row;
	}
	y += m.zoneGap;

	y = heading('mitnehmen', LEFT, y);
	s.entry(input.remember.join(' · '), m.cap, L2, y + m.row - m.cap * 0.9, RIGHT - L2, ['remember']);
	s.line(LEFT, RIGHT, y + m.row);
	return s.finish(y + m.row);
}

/**
 * C „Randspalte“: Überschriften stehen in einer Spalte links, auf der Grundlinie ihrer ersten Zeile;
 * der Inhalt beginnt rechts davon, Kästchen und Uhrzeiten hängen vor ihm. Die Hauptsache und die Routinen
 * brauchen die volle Breite: Die Hauptsache wäre in der Inhaltsspalte höchstens 133 mm breit, das Beispiel braucht 154,5 mm.
 */
export function layoutMargin(kura: Kura, input: DaySheetInput, font: LoadedFont) {
	const s = sheet(kura, font);
	const { m } = s;
	const headings = ['außerdem', 'termine', 'mitnehmen'];
	const R = LEFT + Math.max(...headings.map((h) => s.width(h, 'sign', m.headingCap))) + m.cap * 1.5;
	// Uhrzeiten hängen vor T, ohne in die Randspalte zu ragen
	const T = R + s.width('00:00', 'text', m.cap) + m.gap;
	const margin = (text: string, baseline: number, tone?: PrintTone) => s.put(text, 'sign', m.headingCap, LEFT, baseline, [], 'left', tone);
	let y = s.header(input) + m.zoneGap;

	// Die Hauptsache als einzige Zeile über die volle Breite, Überschrift darüber, erster Schritt als ihre Unterzeile
	s.put('heute wichtig', 'sign', m.headingCap, LEFT, y + m.headingCap, [], 'left', 'signal');
	y += m.headingCap + m.headingGap;
	const focusBox = m.focusCap * 1.1;
	const focusText = LEFT + focusBox + m.gap;
	const focusBaseline = y + m.focusRow - m.focusCap * 0.9;
	s.box(LEFT, focusBaseline, m.focusCap, focusBox, 'signal', 2);
	s.entry(input.focus.text, m.focusCap, focusText, focusBaseline, RIGHT - focusText, ['focus', 'text']);
	const stepBaseline = focusBaseline + m.row;
	const label = s.put('erster schritt', 'sign', m.headingCap, focusText, stepBaseline) + m.gap;
	s.entry(input.focus.firstStep, m.cap, focusText + label, stepBaseline, RIGHT - focusText - label, ['focus', 'firstStep']);
	y = stepBaseline + m.cap * 0.9 + m.gap;
	s.line(LEFT, RIGHT, y);
	y += m.zoneGap;

	y = routines(s, input, y, LEFT + m.box + m.gap, { from: LEFT, to: RIGHT }) + m.zoneGap * 0.6;

	for (let i = 0; i < DAY_SHEET_LIMITS.tasks; i++) {
		const task = input.tasks[i];
		const baseline = y + m.row - m.cap * 0.9;
		if (i === 0) margin('außerdem', baseline);
		s.box(T - m.gap - m.box, baseline, m.cap);
		const duration = task?.minutes ? s.put(`${task.minutes} min`, 'text', m.cap, RIGHT, baseline, ['tasks', i, 'minutes'], 'right') + m.cap * 1.5 : 0;
		if (task) s.entry(task.text, m.cap, T, baseline, RIGHT - T - duration, ['tasks', i, 'text']);
		s.line(R, RIGHT, y + m.row);
		y += m.row;
	}
	y += m.zoneGap * 0.6;

	for (let i = 0; i < DAY_SHEET_LIMITS.appointments; i++) {
		const a = input.appointments[i];
		const baseline = y + m.row - m.cap * 0.9;
		if (i === 0) margin('termine', baseline);
		if (a) {
			s.put(a.time, 'text', m.cap, T - m.gap, baseline, ['appointments', i, 'time'], 'right');
			const leave = a.leaveAt ? s.put(`los ${a.leaveAt}`, 'text', m.cap, RIGHT, baseline, ['appointments', i, 'leaveAt'], 'right') + m.cap * 1.5 : 0;
			s.entry(a.text, m.cap, T, baseline, RIGHT - T - leave, ['appointments', i, 'text']);
		}
		s.line(R, RIGHT, y + m.row);
		y += m.row;
	}
	y += m.zoneGap * 0.6;

	const rememberBaseline = y + m.row - m.cap * 0.9;
	margin('mitnehmen', rememberBaseline);
	s.entry(input.remember.join(' · '), m.cap, T, rememberBaseline, RIGHT - T, ['remember']);
	s.line(R, RIGHT, y + m.row);
	return s.finish(y + m.row);
}

export const DAY_SHEET_VARIANTS = [
	{ id: 'A', name: 'Eine Fluchtlinie', layout: layoutLine },
	{ id: 'B', name: 'Zwei Fluchtlinien', layout: layoutTwoLines },
	{ id: 'C', name: 'Randspalte', layout: layoutMargin }
] as const;
