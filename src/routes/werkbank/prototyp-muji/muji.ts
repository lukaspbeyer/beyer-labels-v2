/**
 * PROTOTYP, zum Wegwerfen: ein alternatives Kura nach dem Vorbild der Muji-Drucksachen,
 * nur für den Vergleich auf /werkbank/prototyp-muji. Kein Produkt und keine Seite außer dieser liest es.
 *
 * Was Kura ausdrücken kann (Schrift, Schreibweise, Laufweite, Größen), steht in kura-muji.json und läuft
 * durch dieselbe Satzlogik wie das geltende Kura. Was darüber hinausgeht (Papierton, Signalfarbe,
 * Kopf der Tagesübersicht mit großer Tageszahl), steht nur hier.
 */
import { parseKura, type Kura } from '$lib/kura/kura';
import { placeLine, setRoleLine } from '$lib/kura/textRole';
import type { PrintItem } from '$lib/media/paper/page';
import { DAY_SHEET_LIMITS, ROUTINE_BLOCKS, type DaySheetInput } from '$lib/products/daySheet';
import { hint, type Hint } from '$lib/products/hint';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { formatMm } from '$lib/typesetting/format';
import { roundedRectPath, svgPathData } from '$lib/typesetting/geometry';
import type { PathCommand, Rect } from '$lib/typesetting/types';
import values from './kura-muji.json';

function load(): Kura {
	const result = parseKura(values);
	if (!result.ok) throw new Error(`kura-muji.json ist ungültig:\n${result.error.join('\n')}`);
	return result.value;
}

/** Das alternative Kura */
export const MUJI: Kura = load();

/** Was Kura heute nicht ausdrücken kann */
export const MUJI_EXTRAS = {
	/** Zweite Druckfarbe, nur als Signal: die Tageszahl */
	signal: '#e4402b',
	/** Papierton: Kraftetikett und Naturpapier */
	paper: { label: '#cfae86', sheet: '#f4f0e6' }
} as const;

/** Ein Druckelement mit eigener Farbe; ohne `ink` gilt die Druckfarbe aus Kura. */
export type MujiItem = PrintItem & { ink?: string };

export interface MujiPage {
	width: number;
	height: number;
	items: MujiItem[];
}

/** Die Seite als SVG, wie `paperPreview`, aber mit Farbe je Element. */
export function mujiSvg(kura: Kura, page: MujiPage, part: Rect = { x: 0, y: 0, width: page.width, height: page.height }): string {
	const shapes = page.items.map((item) => {
		const ink = item.ink ?? kura.paper.ink;
		return item.kind === 'fill'
			? `<path fill="${ink}" d="${svgPathData(item.commands)}"/>`
			: `<path fill="none" stroke="${ink}" stroke-width="${item.widthMm}" d="${svgPathData(item.commands)}"/>`;
	});
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${part.x} ${part.y} ${part.width} ${part.height}">${shapes.join('')}</svg>`;
}

/** Kalenderwoche nach ISO 8601 */
function isoWeek(date: Date): number {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const weekday = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - weekday);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const SHEET = { width: 210, height: 297, margin: 18 } as const;

/**
 * Die Tagesübersicht im Geist des Abreißkalenders: große Tageszahl in Signalrot, daneben Wochentag,
 * Monat und Kalenderwoche. Ab der ersten Zone dieselbe Ordnung wie das Produkt (Kopie von layoutDaySheet).
 */
export function layoutMujiDaySheet(kura: Kura, input: DaySheetInput, font: LoadedFont, numberCap = 44): { page: MujiPage; hints: Hint[] } {
	const items: MujiItem[] = [];
	const hints: Hint[] = [];
	const cap = kura.paper.textCapHeight;
	const rule = kura.paper.ruleWidth;
	const left = SHEET.margin;
	const width = SHEET.width - 2 * SHEET.margin;
	const right = left + width;
	const headingCap = cap * 0.72;
	const focusCap = cap * 1.55;
	const row = cap * 2.75;
	const focusRow = cap * 3.7;
	const zoneGap = cap * 2.5;
	const headingGap = cap * 1.25;
	const box = cap * 1.25;
	const entryLeft = left + box + cap * 0.9;

	function put(text: string, role: 'sign' | 'text', capHeight: number, anchor: number, y: number, at: Hint['at'], side: 'left' | 'right' = 'left', ink?: string): number {
		if (!text) return 0;
		const set = setRoleLine(kura, font, role, text, capHeight, at);
		hints.push(...set.hints);
		if (set.width === 0) return 0;
		items.push({ kind: 'fill', commands: placeLine(set, side, { x: anchor, width: 0 }, y).commands, ink });
		return set.width;
	}

	function entry(text: string, capHeight: number, x: number, y: number, available: number, at: Hint['at']): void {
		const used = put(text, 'text', capHeight, x, y, at);
		if (used > available + 1e-6)
			hints.push(hint('too-long', `„${text}“ ist ${formatMm(used)} mm breit, Platz sind ${formatMm(available)} mm. Kürzer fassen.`, at));
	}

	function line(x1: number, x2: number, y: number): void {
		const commands: PathCommand[] = [
			{ type: 'M', x: x1, y },
			{ type: 'L', x: x2, y }
		];
		items.push({ kind: 'stroke', commands, widthMm: rule });
	}

	function checkbox(x: number, baseline: number, capHeight = cap): void {
		items.push({ kind: 'stroke', commands: roundedRectPath(x, baseline - capHeight / 2 - box / 2, box, box, 0), widthMm: rule });
	}

	function heading(text: string, x: number, y: number): number {
		put(text, 'sign', headingCap, x, y + headingCap, []);
		return y + headingCap + headingGap;
	}

	// Kopf wie am Abreißkalender: die Zahl trägt das Blatt, alles andere ist klein
	const day = new Date(`${input.date}T00:00:00Z`);
	const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: 'UTC' }).format(day);
	const month = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(day);
	const numberBaseline = SHEET.margin + numberCap;
	const numberWidth = put(String(day.getUTCDate()), 'text', numberCap, left, numberBaseline, ['date'], 'left', MUJI_EXTRAS.signal);
	const infoLeft = left + numberWidth + cap * 2.2;
	put(month, 'text', cap * 1.15, infoLeft, numberBaseline, ['date']);
	put(weekday, 'sign', cap * 1.15, infoLeft, numberBaseline - cap * 1.15 - cap * 1.1, ['date']);
	put(`KW ${isoWeek(day)}`, 'text', cap * 1.15, right, SHEET.margin + cap * 1.15, ['date'], 'right');
	const headerRule = numberBaseline + cap * 2.2;
	line(left, right, headerRule);
	let y = headerRule + zoneGap;

	y = heading('heute wichtig', left, y);
	const focusBaseline = y + focusRow - focusCap * 0.9;
	checkbox(left, focusBaseline, focusCap);
	entry(input.focus.text, focusCap, entryLeft, focusBaseline, right - entryLeft, ['focus', 'text']);
	line(left, right, y + focusRow);
	y += focusRow + headingGap;
	y = heading('erster schritt', entryLeft, y) - headingGap + cap * 0.35;
	entry(input.focus.firstStep, cap, entryLeft, y + row - cap * 0.9, right - entryLeft, ['focus', 'firstStep']);
	line(entryLeft, right, y + row);
	y += row + zoneGap;

	const columnGap = cap * 2;
	const column = (width - 2 * columnGap) / 3;
	const routineTop = y;
	ROUTINE_BLOCKS.forEach(({ id, name }, c) => {
		const x = left + c * (column + columnGap);
		let rowY = heading(name, x, routineTop);
		input.routines[id].slice(0, DAY_SHEET_LIMITS.routinesPerBlock).forEach((text, i) => {
			const baseline = rowY + row - cap * 0.9;
			checkbox(x, baseline);
			entry(text, cap, x + (entryLeft - left), baseline, column - (entryLeft - left), ['routines', id, i]);
			rowY += row;
		});
	});
	y = routineTop + headingCap + headingGap + DAY_SHEET_LIMITS.routinesPerBlock * row + zoneGap;

	y = heading('außerdem', left, y);
	for (let i = 0; i < DAY_SHEET_LIMITS.tasks; i++) {
		const task = input.tasks[i];
		const baseline = y + row - cap * 0.9;
		checkbox(left, baseline);
		const durationWidth = task?.minutes ? put(`${task.minutes} min`, 'text', cap, right, baseline, ['tasks', i, 'minutes'], 'right') + cap * 1.5 : 0;
		if (task) entry(task.text, cap, entryLeft, baseline, right - entryLeft - durationWidth, ['tasks', i, 'text']);
		line(left, right, y + row);
		y += row;
	}
	y += zoneGap;

	y = heading('termine', left, y);
	const appointmentLeft = left + cap * 5.2;
	for (let i = 0; i < DAY_SHEET_LIMITS.appointments; i++) {
		const appointment = input.appointments[i];
		const baseline = y + row - cap * 0.9;
		if (appointment) {
			put(appointment.time, 'text', cap, left, baseline, ['appointments', i, 'time']);
			const leaveWidth = appointment.leaveAt ? put(`los ${appointment.leaveAt}`, 'text', cap, right, baseline, ['appointments', i, 'leaveAt'], 'right') + cap * 1.5 : 0;
			entry(appointment.text, cap, appointmentLeft, baseline, right - appointmentLeft - leaveWidth, ['appointments', i, 'text']);
		}
		line(left, right, y + row);
		y += row;
	}
	y += zoneGap;

	y = heading('mitnehmen', left, y);
	entry(input.remember.join(' · '), cap, left, y + row - cap * 0.9, width, ['remember']);
	line(left, right, y + row);
	y += row;

	if (y > SHEET.height - SHEET.margin + 1e-6) hints.push(hint('overflow', `Das Blatt ist ${formatMm(y - (SHEET.height - SHEET.margin))} mm zu lang.`));
	return { page: { width: SHEET.width, height: SHEET.height, items }, hints };
}
