/**
 * Produkt Tagesübersicht: ein Blatt A4 hochkant für einen Tag, im Hausdesign Kura.
 * Unterregeln des Produkts: feste Zonen in fester Reihenfolge, Obergrenzen je Zone, jeder Eintrag eine Zeile.
 * Der Inhalt kommt vollständig von außen (ADR 0004); Schrift, Laufweiten und Größen leiten sich aus Kura ab.
 */
import type { Kura } from '$lib/kura/kura';
import { placeLine, setRoleLine, setSign } from '$lib/kura/textRole';
import { pageSvg, type PrintItem, type PrintPage } from '$lib/media/paper/page';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { formatMm } from '$lib/typesetting/format';
import { roundedRectPath } from '$lib/typesetting/geometry';
import type { PathCommand } from '$lib/typesetting/types';
import { err, ok, type Result } from '$utils/result';
import { hint, type Hint } from './hint';
import { defineProduct, type Parsed } from './product';

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
		hints.push(hint('date', 'Datum als JJJJ-MM-TT angeben, etwa 2026-11-26.', ['date']));
	const focus = isRecord(source.focus) ? source.focus : {};
	const routineSource = isRecord(source.routines) ? source.routines : {};
	const routines = Object.fromEntries(
		ROUTINE_BLOCKS.map(({ id, name }) => {
			const entries = list(routineSource[id]).map(line).filter(Boolean);
			if (entries.length > DAY_SHEET_LIMITS.routinesPerBlock)
				hints.push(hint('too-many', `${name} hat ${entries.length} Routinen, höchstens ${DAY_SHEET_LIMITS.routinesPerBlock} passen aufs Blatt. Die wichtigsten auswählen.`, ['routines', id]));
			return [id, entries];
		})
	) as Record<RoutineBlockId, string[]>;
	const tasks = list(source.tasks)
		.map((t) => (isRecord(t) ? { text: line(t.text), minutes: typeof t.minutes === 'number' && t.minutes > 0 ? Math.round(t.minutes) : undefined } : { text: line(t) }))
		.filter((t) => t.text);
	if (tasks.length > DAY_SHEET_LIMITS.tasks)
		hints.push(hint('too-many', `${tasks.length} Aufgaben, höchstens ${DAY_SHEET_LIMITS.tasks} neben der Hauptsache. Den Rest auf einen anderen Tag legen.`, ['tasks']));
	const appointments = list(source.appointments)
		.filter(isRecord)
		.map((a) => ({ time: line(a.time), text: line(a.text), leaveAt: line(a.leaveAt) || undefined }))
		.filter((a) => a.text || a.time);
	if (appointments.length > DAY_SHEET_LIMITS.appointments)
		hints.push(hint('too-many', `${appointments.length} Termine, höchstens ${DAY_SHEET_LIMITS.appointments} passen aufs Blatt.`, ['appointments']));
	appointments.forEach((a, i) => {
		if (!TIME.test(a.time)) hints.push(hint('time', 'Uhrzeit als HH:MM angeben, etwa 09:30.', ['appointments', i, 'time']));
		if (a.leaveAt && !TIME.test(a.leaveAt)) hints.push(hint('time', 'Uhrzeit als HH:MM angeben, etwa 09:05.', ['appointments', i, 'leaveAt']));
	});
	const remember = list(source.remember).map(line).filter(Boolean);
	if (remember.length > DAY_SHEET_LIMITS.remember)
		hints.push(hint('too-many', `${remember.length} Dinge zum Mitnehmen, höchstens ${DAY_SHEET_LIMITS.remember}.`, ['remember']));
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
	// Zwei Kanten für das ganze Blatt: an der linken stehen Überschriften, Kästchen und Uhrzeiten, an der zweiten jeder Eintrag
	const entryLeft = left + box + cap * 0.9;

	/** Setzt einen Einzeiler in der Textrolle; `anchor` ist die linke oder rechte Kante, `y` die Grundlinie. Liefert die Breite. */
	function put(text: string, role: 'sign' | 'text', capHeight: number, anchor: number, y: number, at: Hint['at'], side: 'left' | 'right' = 'left'): number {
		if (!text) return 0;
		const set = setRoleLine(kura, font, role, text, capHeight, at);
		hints.push(...set.hints);
		if (set.width === 0) return 0;
		items.push({ kind: 'fill', commands: placeLine(set, side, { x: anchor, width: 0 }, y).commands });
		return set.width;
	}

	/** Einzeiler mit Breitenprüfung: zu lange Einträge werden gemeldet, nicht umbrochen. */
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

	/** Kästchen an der Kante `x`, senkrecht mittig zur Versalhöhe `capHeight` der Zeile. */
	function checkbox(x: number, baseline: number, capHeight = cap): void {
		items.push({ kind: 'stroke', commands: roundedRectPath(x, baseline - capHeight / 2 - box / 2, box, box, 0), widthMm: rule });
	}

	function heading(text: string, x: number, y: number): number {
		put(text, 'sign', headingCap, x, y + headingCap, []);
		return y + headingCap + headingGap;
	}

	// Kopf: Wochentag als Zeichen, Datum als Unterzeile. Das Zeichen steht hier nicht allein, es folgt der Ausrichtung des Textes.
	const day = new Date(`${input.date}T00:00:00Z`);
	const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: 'UTC' }).format(day);
	const dateText = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(day);
	const header = setSign(kura, font, { x: left, y: SHEET.margin, width, height: SHEET.headerHeight }, { text: weekday, at: ['date'] }, { text: dateText, at: ['date'] }, { besideText: true, vertical: 'top' });
	hints.push(...header.hints);
	for (const l of header.lines) if (l.commands.length > 0) items.push({ kind: 'fill', commands: l.commands });
	let y = SHEET.margin + SHEET.headerHeight + zoneGap;

	// Heute wichtig: eine Sache, größer als alles andere, darunter der erste Schritt
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
			entry(text, cap, x + (entryLeft - left), baseline, column - (entryLeft - left), ['routines', id, i]);
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
		const durationWidth = task?.minutes ? put(`${task.minutes} min`, 'text', cap, right, baseline, ['tasks', i, 'minutes'], 'right') + cap * 1.5 : 0;
		if (task) entry(task.text, cap, entryLeft, baseline, right - entryLeft - durationWidth, ['tasks', i, 'text']);
		line(left, right, y + row);
		y += row;
	}
	y += zoneGap;

	// Termine: Uhrzeit an der linken Kante, Sache in eigener Spalte, rechts die Zeit zum Losgehen
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

	// Mitnehmen: eine Zeile
	y = heading('mitnehmen', left, y);
	entry(input.remember.join(' · '), cap, left, y + row - cap * 0.9, width, ['remember']);
	line(left, right, y + row);
	y += row;

	if (y > SHEET.height - SHEET.margin + 1e-6)
		hints.push(hint('overflow', `Das Blatt ist ${formatMm(y - (SHEET.height - SHEET.margin))} mm zu lang. Die Lesegröße in Kura ist für dieses Blatt zu groß.`));
	return { page: { width: SHEET.width, height: SHEET.height, items }, hints };
}

/** Höchstzahl der Tage in einer Datei */
export const MAX_DAYS = 7;

/** Ein oder mehrere Tage für ein PDF, ein Blatt je Tag. */
export interface DaySheetOrder {
	days: DaySheetInput[];
}

/** Dateiname nach dem Muster tagesuebersicht-2026-11-26.pdf; bei mehreren Tagen tagesuebersicht-2026-11-26-bis-2026-11-27.pdf */
function fileNameOf(days: readonly DaySheetInput[]): string {
	if (days.length === 0) return '';
	return days.length === 1 ? `tagesuebersicht-${days[0].date}.pdf` : `tagesuebersicht-${days[0].date}-bis-${days[days.length - 1].date}.pdf`;
}

function parseDay(raw: unknown): Parsed<DaySheetInput> {
	const day = parseDaySheet(raw);
	return day.ok ? { value: day.value, hints: [] } : { value: null, hints: day.error };
}

function set(kura: Kura, order: DaySheetOrder, font: LoadedFont) {
	const days = order.days.map((day) => layoutDaySheet(kura, day, font));
	const pages = days.map((d) => d.page);
	const fileName = fileNameOf(order.days);
	return {
		/** Je Tag sein Blatt und die Hinweise dazu */
		days,
		/** Je Tag ein Blatt */
		pages,
		fileName,
		async file() {
			// Die PDF-Bibliothek erst laden, wenn gedruckt wird
			const { renderPdf } = await import('$lib/media/paper/pdf');
			return { fileName, mime: 'application/pdf', body: await renderPdf(pages, kura.paper.ink, 'Tagesübersicht') };
		}
	};
}

const L = DAY_SHEET_LIMITS;

export const daySheet = defineProduct({
	id: 'tagesuebersicht',
	name: 'Tagesübersicht',
	medium: 'Papier-Druck',
	nav: 'Tag',
	summary: 'Ein Blatt A4 für einen Tag: eine Hauptsache, Routinen, Termine. Ausprobieren und als PDF drucken.',
	href: '/tag',
	output: 'PDF',
	order: () => ({
		description:
			'Ein Blatt A4 hochkant für einen Tag: eine Hauptsache mit kleinstem ersten Schritt, feste Routinen, wenige weitere Aufgaben, Termine, Mitnehmen. ' +
			'Jeder Eintrag ist eine kurze Zeile; zu lange Einträge werden abgelehnt und müssen gekürzt werden. Die Obergrenzen sind Absicht: Was nicht aufs Blatt passt, gehört nicht in diesen Tag. ' +
			`Für mehrere Tage statt eines Tages { "days": [ … ] } mit höchstens ${MAX_DAYS} Tagen senden; das ergibt ein PDF mit einer Seite je Tag. Das System merkt sich nichts: Jeder Aufruf enthält den vollständigen Inhalt einschließlich der Routinen.`,
		fields: [
			{ name: 'date', type: 'string', required: true, description: 'Tag als JJJJ-MM-TT.' },
			{ name: 'focus.text', type: 'string', required: false, description: 'Heute wichtig: genau eine Sache.' },
			{ name: 'focus.firstStep', type: 'string', required: false, description: 'Die kleinste konkrete erste Handlung dazu, etwa „Laptop aufklappen, Datei öffnen“.' },
			{ name: ROUTINE_BLOCKS.map((b) => `routines.${b.id}`).join(' | '), type: 'string[]', required: false, description: `Feste Routinen je Tagesabschnitt, je höchstens ${L.routinesPerBlock}, jeweils zwei bis drei Wörter.` },
			{ name: 'tasks', type: '{ text: string, minutes?: number }[]', required: false, description: `Weitere Aufgaben, höchstens ${L.tasks}; minutes ist die geschätzte Dauer.` },
			{ name: 'appointments', type: '{ time: "HH:MM", text: string, leaveAt?: "HH:MM" }[]', required: false, description: `Termine, höchstens ${L.appointments}; leaveAt ist die Zeit zum Losgehen.` },
			{ name: 'remember', type: 'string[]', required: false, description: `Mitnehmen, höchstens ${L.remember} Dinge, zusammen eine Zeile.` }
		],
		example: DAY_SHEET_EXAMPLE
	}),
	pieces: { list: 'days', limit: () => ({ max: MAX_DAYS, message: `1 bis ${MAX_DAYS} Tage angeben.` }) },
	parse: parseDay,
	set,
	examples(kura, font) {
		const { page, hints } = layoutDaySheet(kura, DAY_SHEET_EXAMPLE, font);
		return [{ caption: 'A4 hoch', svg: pageSvg(page, kura.paper.ink), width: page.width, height: page.height, hints }];
	}
});

/** Der Satz eines oder mehrerer Tage und das PDF */
export type DaySheetProof = ReturnType<typeof daySheet.set>;
