/**
 * Produkt Tagesübersicht: ein Blatt A4 hochkant für einen Tag, im Hausdesign Kura.
 * Unterregeln des Produkts: feste Zonen in fester Reihenfolge, Obergrenzen je Zone, jeder Eintrag eine Zeile.
 * Der Inhalt kommt vollständig von außen (ADR 0004); Schrift, Laufweiten und Größen leiten sich aus Kura ab.
 */
import { applyCase, signCapHeight, type Kura } from '$lib/kura/kura';
import type { PrintItem, PrintPage } from '$lib/media/paper/page';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { formatMm } from '$lib/typesetting/format';
import { roundedRectPath, translatePath } from '$lib/typesetting/geometry';
import { setLine } from '$lib/typesetting/line';
import type { PathCommand } from '$lib/typesetting/types';
import { err, ok, type Result } from '$utils/result';
import type { Hint } from './hint';

/** Obergrenzen je Zone. Was nicht aufs Blatt passt, gehört nicht in diesen Tag. */
export const DAY_SHEET_LIMITS = { routinesPerBlock: 4, tasks: 3, appointments: 4, remember: 3 } as const;

export const ROUTINE_BLOCKS = [
	{ id: 'morning', name: 'morgens' },
	{ id: 'midday', name: 'mittags' },
	{ id: 'evening', name: 'abends' }
] as const;

export type RoutineBlockId = (typeof ROUTINE_BLOCKS)[number]['id'];

export interface DaySheetInput {
	/** Tag als JJJJ-MM-TT */
	date: string;
	/** Heute wichtig: genau eine Sache, dazu die kleinste konkrete erste Handlung */
	focus: { text: string; firstStep: string };
	/** Feste Routinen je Tagesabschnitt */
	routines: Record<RoutineBlockId, string[]>;
	/** Außerdem: weitere Aufgaben, wahlweise mit Dauer in Minuten */
	tasks: { text: string; minutes?: number }[];
	/** Termine mit Uhrzeit HH:MM, wahlweise mit der Zeit zum Losgehen */
	appointments: { time: string; text: string; leaveAt?: string }[];
	/** Mitnehmen, nicht vergessen */
	remember: string[];
}

export const DAY_SHEET_EXAMPLE: DaySheetInput = {
	date: '2026-11-26',
	focus: { text: 'Steuerunterlagen an Frau Lindner schicken', firstStep: 'Ordner „Steuer 2025“ auf den Tisch legen' },
	routines: {
		morning: ['Tabletten', 'Frühstück', 'Brotdosen packen'],
		midday: ['Wasser trinken', 'Wäsche aufhängen'],
		evening: ['Tasche für morgen', 'Handy laden', 'Küche 10 Minuten']
	},
	tasks: [{ text: 'Rezept in der Apotheke abholen', minutes: 15 }, { text: 'Elternbrief unterschreiben', minutes: 5 }, { text: 'Geschenk für Oma bestellen' }],
	appointments: [
		{ time: '09:30', text: 'Zahnärztin', leaveAt: '09:05' },
		{ time: '15:00', text: 'Kinder abholen', leaveAt: '14:40' }
	],
	remember: ['Versichertenkarte', 'Turnbeutel']
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Text aus beliebiger Eingabe: fehlend wird leer, alles andere ein getrimmter Einzeiler. */
function line(value: unknown): string {
	return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function list(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

/** Prüft Form und Obergrenzen eines Inhalts von außen und liefert alle Verstöße auf einmal. */
export function parseDaySheet(raw: unknown): Result<DaySheetInput, Hint[]> {
	const hints: Hint[] = [];
	const source = isRecord(raw) ? raw : {};
	const date = line(source.date);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)))
		hints.push({ kind: 'date', message: 'date: Datum als JJJJ-MM-TT angeben, etwa 2026-11-26.' });
	const focus = isRecord(source.focus) ? source.focus : {};
	const routineSource = isRecord(source.routines) ? source.routines : {};
	const routines = Object.fromEntries(
		ROUTINE_BLOCKS.map(({ id, name }) => {
			const entries = list(routineSource[id]).map(line).filter(Boolean);
			if (entries.length > DAY_SHEET_LIMITS.routinesPerBlock)
				hints.push({ kind: 'too-many', message: `routines.${id}: ${name} hat ${entries.length} Routinen, höchstens ${DAY_SHEET_LIMITS.routinesPerBlock} passen aufs Blatt. Die wichtigsten auswählen.` });
			return [id, entries];
		})
	) as Record<RoutineBlockId, string[]>;
	const tasks = list(source.tasks)
		.map((t) => (isRecord(t) ? { text: line(t.text), minutes: typeof t.minutes === 'number' && t.minutes > 0 ? Math.round(t.minutes) : undefined } : { text: line(t) }))
		.filter((t) => t.text);
	if (tasks.length > DAY_SHEET_LIMITS.tasks)
		hints.push({ kind: 'too-many', message: `tasks: ${tasks.length} Aufgaben, höchstens ${DAY_SHEET_LIMITS.tasks} neben der Hauptsache. Den Rest auf einen anderen Tag legen.` });
	const appointments = list(source.appointments)
		.filter(isRecord)
		.map((a) => ({ time: line(a.time), text: line(a.text), leaveAt: line(a.leaveAt) || undefined }))
		.filter((a) => a.text || a.time);
	if (appointments.length > DAY_SHEET_LIMITS.appointments)
		hints.push({ kind: 'too-many', message: `appointments: ${appointments.length} Termine, höchstens ${DAY_SHEET_LIMITS.appointments} passen aufs Blatt.` });
	appointments.forEach((a, i) => {
		if (!TIME.test(a.time)) hints.push({ kind: 'time', message: `appointments[${i}].time: Uhrzeit als HH:MM angeben, etwa 09:30.` });
		if (a.leaveAt && !TIME.test(a.leaveAt)) hints.push({ kind: 'time', message: `appointments[${i}].leaveAt: Uhrzeit als HH:MM angeben, etwa 09:05.` });
	});
	const remember = list(source.remember).map(line).filter(Boolean);
	if (remember.length > DAY_SHEET_LIMITS.remember)
		hints.push({ kind: 'too-many', message: `remember: ${remember.length} Dinge zum Mitnehmen, höchstens ${DAY_SHEET_LIMITS.remember}.` });
	if (hints.length > 0) return err(hints);
	return ok({ date, focus: { text: line(focus.text), firstStep: line(focus.firstStep) }, routines, tasks, appointments, remember });
}

/** Maße des Blatts in mm. Zeilen und Abstände sind Vielfache der Lesegröße aus Kura. */
const SHEET = { width: 210, height: 297, margin: 18, headerHeight: 30 } as const;

export function layoutDaySheet(kura: Kura, input: DaySheetInput, font: LoadedFont): { page: PrintPage; hints: Hint[] } {
	const items: PrintItem[] = [];
	const hints: Hint[] = [];
	const cap = kura.paper.textCapHeight;
	const rule = kura.paper.ruleWidth;
	const left = SHEET.margin;
	const width = SHEET.width - 2 * SHEET.margin;
	const right = left + width;
	// Unterregeln: alle Größen hängen an der Lesegröße
	const headingCap = cap * 0.72;
	const focusCap = cap * 1.55;
	const row = cap * 2.75;
	const focusRow = cap * 3.7;
	const zoneGap = cap * 2.5;
	const headingGap = cap * 1.25;
	const box = cap * 1.25;
	const inset = box + cap * 0.9;

	/** Setzt einen Einzeiler; `anchor` ist die linke oder rechte Kante, `y` die Grundlinie. */
	function put(text: string, role: 'sign' | 'text', capHeight: number, anchor: number, y: number, side: 'left' | 'right' = 'left'): number {
		const shown = applyCase(kura[role].case, text);
		if (!shown) return 0;
		const unsupported = Array.from(shown).filter((ch) => ch !== ' ' && font.font.charToGlyph(ch).index === 0);
		if (unsupported.length > 0)
			hints.push({ kind: 'character', message: `„${text}“ enthält Zeichen, die die Schrift nicht hat: ${[...new Set(unsupported)].join(' ')}. Ersetzen oder weglassen.` });
		const set = setLine(font, shown, capHeight, kura[role].trackingPercent);
		if (!Number.isFinite(set.ink.maxX)) return 0;
		const inkWidth = set.ink.maxX - set.ink.minX;
		const x = side === 'left' ? anchor - set.ink.minX : anchor - set.ink.maxX;
		items.push({ kind: 'fill', commands: translatePath(set.commands, x, y) });
		return inkWidth;
	}

	/** Einzeiler mit Breitenprüfung: zu lange Einträge werden gemeldet, nicht umbrochen. */
	function entry(text: string, capHeight: number, x: number, y: number, available: number, where: string): void {
		const used = put(text, 'text', capHeight, x, y);
		if (used > available + 1e-6)
			hints.push({ kind: 'too-long', message: `${where}: „${text}“ ist ${formatMm(used)} mm breit, Platz sind ${formatMm(available)} mm. Kürzer fassen.` });
	}

	function line(x1: number, x2: number, y: number): void {
		const commands: PathCommand[] = [
			{ type: 'M', x: x1, y },
			{ type: 'L', x: x2, y }
		];
		items.push({ kind: 'stroke', commands, widthMm: rule });
	}

	function checkbox(x: number, baseline: number, size = box): void {
		items.push({ kind: 'stroke', commands: roundedRectPath(x, baseline - size + (size - cap) / 2, size, size, 0), widthMm: rule });
	}

	function heading(text: string, x: number, y: number): number {
		put(text, 'sign', headingCap, x, y + headingCap);
		return y + headingCap + headingGap;
	}

	// Kopf: Wochentag als Zeichen, Datum als Unterzeile
	const day = new Date(`${input.date}T00:00:00Z`);
	const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: 'UTC' }).format(day);
	const dateText = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(day);
	const signCap = signCapHeight(kura, width, SHEET.headerHeight);
	const subCap = signCap * kura.subLine.capRatio;
	const anchor = kura.sign.align === 'left' ? left : kura.sign.align === 'right' ? right : left + width / 2;
	const headerLines: [string, number, number][] = [
		[weekday, signCap, SHEET.margin + signCap],
		[dateText, subCap, SHEET.margin + signCap + kura.subLine.lineSpacing * signCap + subCap]
	];
	for (const [text, capHeight, baseline] of headerLines) {
		const set = setLine(font, applyCase(kura.sign.case, text), capHeight, kura.sign.trackingPercent);
		const inkWidth = set.ink.maxX - set.ink.minX;
		const x = kura.sign.align === 'left' ? anchor : kura.sign.align === 'right' ? anchor - inkWidth : anchor - inkWidth / 2;
		items.push({ kind: 'fill', commands: translatePath(set.commands, x - set.ink.minX, baseline) });
	}
	let y = SHEET.margin + SHEET.headerHeight + zoneGap;

	// Heute wichtig: eine Sache, größer als alles andere, darunter der erste Schritt
	y = heading('heute wichtig', left, y);
	const focusBox = focusCap * 1.25;
	const focusInset = focusBox + focusCap * 0.9;
	const focusBaseline = y + focusRow - focusCap * 0.9;
	checkbox(left, focusBaseline, focusBox);
	entry(input.focus.text, focusCap, left + focusInset, focusBaseline, width - focusInset, 'focus.text');
	line(left, right, y + focusRow);
	y += focusRow + headingGap;
	const stepLabel = left + focusInset;
	put('erster schritt', 'sign', headingCap, stepLabel, y + row - cap * 0.9);
	const stepX = stepLabel + cap * 9.5;
	entry(input.focus.firstStep, cap, stepX, y + row - cap * 0.9, right - stepX, 'focus.firstStep');
	line(stepX, right, y + row);
	y += row + zoneGap;

	// Routinen: drei Spalten, nur was gilt
	const columnGap = cap * 2;
	const column = (width - 2 * columnGap) / 3;
	const routineTop = y;
	ROUTINE_BLOCKS.forEach(({ id, name }, c) => {
		const x = left + c * (column + columnGap);
		let rowY = heading(name, x, routineTop);
		input.routines[id].slice(0, DAY_SHEET_LIMITS.routinesPerBlock).forEach((text, i) => {
			const baseline = rowY + row - cap * 0.9;
			checkbox(x, baseline);
			entry(text, cap, x + inset, baseline, column - inset, `routines.${id}[${i}]`);
			rowY += row;
		});
	});
	y = routineTop + headingCap + headingGap + DAY_SHEET_LIMITS.routinesPerBlock * row + zoneGap;

	// Außerdem: immer drei Plätze, leere bleiben zum Schreiben
	y = heading('außerdem', left, y);
	for (let i = 0; i < DAY_SHEET_LIMITS.tasks; i++) {
		const task = input.tasks[i];
		const baseline = y + row - cap * 0.9;
		checkbox(left, baseline);
		const durationWidth = task?.minutes ? put(`${task.minutes} min`, 'text', cap, right, baseline, 'right') + cap * 1.5 : 0;
		if (task) entry(task.text, cap, left + inset, baseline, width - inset - durationWidth, `tasks[${i}].text`);
		line(left + inset, right, y + row);
		y += row;
	}
	y += zoneGap;

	// Termine: Uhrzeit, Sache, rechts die Zeit zum Losgehen
	y = heading('termine', left, y);
	const timeColumn = cap * 5.2;
	for (let i = 0; i < DAY_SHEET_LIMITS.appointments; i++) {
		const appointment = input.appointments[i];
		const baseline = y + row - cap * 0.9;
		if (appointment) {
			put(appointment.time, 'text', cap, left, baseline);
			const leaveWidth = appointment.leaveAt ? put(`los ${appointment.leaveAt}`, 'text', cap, right, baseline, 'right') + cap * 1.5 : 0;
			entry(appointment.text, cap, left + timeColumn, baseline, width - timeColumn - leaveWidth, `appointments[${i}].text`);
		}
		line(left, right, y + row);
		y += row;
	}
	y += zoneGap;

	// Mitnehmen: eine Zeile
	y = heading('mitnehmen', left, y);
	entry(input.remember.join(' · '), cap, left, y + row - cap * 0.9, width, 'remember');
	line(left, right, y + row);
	y += row;

	if (y > SHEET.height - SHEET.margin + 1e-6)
		hints.push({ kind: 'overflow', message: `Das Blatt ist ${formatMm(y - (SHEET.height - SHEET.margin))} mm zu lang. Die Lesegröße in Kura ist für dieses Blatt zu groß.` });
	return { page: { width: SHEET.width, height: SHEET.height, items }, hints };
}

/** Dateiname nach dem Muster tagesuebersicht-2026-11-26.pdf */
export function daySheetFileName(input: DaySheetInput): string {
	return `tagesuebersicht-${input.date}.pdf`;
}
