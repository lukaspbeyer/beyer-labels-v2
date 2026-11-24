/**
 * Produkt Tagesübersicht: ein Blatt A4 hochkant für einen Tag, im Hausdesign Kura.
 * Unterregeln des Produkts: feste Zonen in fester Reihenfolge, Obergrenzen je Zone, jeder Eintrag eine Zeile.
 * Der Inhalt kommt vollständig von außen (ADR 0004); Schrift, Laufweiten und Größen leiten sich aus Kura ab.
 */
import type { Kura } from '$lib/kura/kura';
import { placeLine, setRoleLine } from '$lib/kura/textRole';
import { PAPER, paperExample, paperFile, paperPreview } from '$lib/media/paper/medium';
import type { PrintItem, PrintPage, PrintTone } from '$lib/media/paper/page';
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
const SHEET = { width: 210, height: 297, margin: 18 } as const;

/** Kalenderwoche nach ISO 8601 */
function isoWeek(day: Date): number {
	const thursday = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
	thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
	const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
	return Math.ceil(((thursday.getTime() - yearStart) / 86400000 + 1) / 7);
}

/**
 * Die eine Fluchtlinie für allen Text unter dem Kopf: Überschriften, Einträge, erster Schritt, Termine und Mitnehmen beginnen hier.
 * Kästchen und Uhrzeiten hängen links davor; der Platz davor ist so breit wie die breiteste denkbare Uhrzeit.
 */
export function entryLine(kura: Kura, font: LoadedFont): number {
	const cap = kura.paper.textCapHeight;
	const digitWidth = (d: string) => setRoleLine(kura, font, 'text', d, cap).width;
	const widest = [...'0123456789'].reduce((a, b) => (digitWidth(b) > digitWidth(a) ? b : a));
	return SHEET.margin + setRoleLine(kura, font, 'text', `${widest}${widest}:${widest}${widest}`, cap).width + cap * 0.9;
}

export function layoutDaySheet(kura: Kura, input: DaySheetInput, font: LoadedFont): { page: PrintPage; hints: Hint[] } {
	const items: PrintItem[] = [];
	const hints: Hint[] = [];
	const cap = kura.paper.textCapHeight;
	const rule = kura.paper.ruleWidth;
	const left = SHEET.margin;
	const right = SHEET.width - SHEET.margin;
	// Unterregeln: alle Größen hängen an der Lesegröße
	const headingCap = cap * 0.72;
	const focusCap = cap * 1.55;
	const dayCap = cap * 10;
	const dateCap = cap * 1.15;
	const row = cap * 2.75;
	const focusRow = cap * 3.7;
	const zoneGap = cap * 2.5;
	const headingGap = cap * 1.25;
	const box = cap * 1.25;
	const gap = cap * 0.9;
	// Eine Fluchtlinie für allen Text; Kästchen und Uhrzeiten enden einen Abstand davor
	const text = entryLine(kura, font);
	const markRight = text - gap;

	/** Setzt einen Einzeiler in der Textrolle; `anchor` ist die linke oder rechte Kante, `y` die Grundlinie. Liefert die Breite. */
	function put(content: string, role: 'sign' | 'text', capHeight: number, anchor: number, y: number, at: Hint['at'], side: 'left' | 'right' = 'left', tone?: PrintTone): number {
		if (!content) return 0;
		const set = setRoleLine(kura, font, role, content, capHeight, at);
		hints.push(...set.hints);
		if (set.width === 0) return 0;
		items.push({ kind: 'fill', commands: placeLine(set, side, { x: anchor, width: 0 }, y).commands, tone });
		return set.width;
	}

	/** Einzeiler mit Breitenprüfung: zu lange Einträge werden gemeldet, nicht umbrochen. */
	function entry(content: string, capHeight: number, x: number, y: number, available: number, at: Hint['at']): void {
		const used = put(content, 'text', capHeight, x, y, at);
		if (used > available + 1e-6)
			hints.push(hint('too-long', `„${content}“ ist ${formatMm(used)} mm breit, Platz sind ${formatMm(available)} mm. Kürzer fassen.`, at));
	}

	function line(x1: number, x2: number, y: number): void {
		const commands: PathCommand[] = [
			{ type: 'M', x: x1, y },
			{ type: 'L', x: x2, y }
		];
		items.push({ kind: 'stroke', commands, widthMm: rule });
	}

	/** Kästchen der Kantenlänge `size`, das bei `end` endet, senkrecht mittig zur Versalhöhe `capHeight` der Zeile. */
	function checkbox(end: number, baseline: number, capHeight = cap, size = box, tone?: PrintTone, weight = 1): void {
		items.push({ kind: 'stroke', commands: roundedRectPath(end - size, baseline - capHeight / 2 - size / 2, size, size, 0), widthMm: rule * weight, tone });
	}

	function heading(content: string, x: number, y: number, tone?: PrintTone): number {
		put(content, 'sign', headingCap, x, y + headingCap, [], 'left', tone);
		return y + headingCap + headingGap;
	}

	// Kopf wie am Abreißkalender: die Tageszahl trägt das Blatt. Daneben, auf ihrer Grundlinie, Wochentag als Zeichen und Monat; oben rechts die Kalenderwoche.
	const day = new Date(`${input.date}T00:00:00Z`);
	const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: 'UTC' }).format(day);
	const month = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(day);
	const dayBaseline = SHEET.margin + dayCap;
	const dateLeft = left + put(String(day.getUTCDate()), 'text', dayCap, left, dayBaseline, ['date']) + cap * 2.2;
	put(month, 'text', dateCap, dateLeft, dayBaseline, ['date']);
	put(weekday, 'sign', dateCap, dateLeft, dayBaseline - dateCap - cap * 1.1, ['date']);
	put(`KW ${isoWeek(day)}`, 'text', dateCap, right, SHEET.margin + dateCap, ['date'], 'right');
	const headerRule = dayBaseline + cap * 2.2;
	line(left, right, headerRule);
	let y = headerRule + zoneGap;

	// Heute wichtig: eine Sache, größer als alles andere. Überschrift und Kästchen in der Signalfarbe; die Sache selbst bleibt
	// in der Druckfarbe, so trägt im Schwarzweißdruck die Größe die Hervorhebung.
	y = heading('heute wichtig', text, y, 'signal');
	const focusBaseline = y + focusRow - focusCap * 0.9;
	// Das Kästchen wächst mit seiner Zeile und ist doppelt so kräftig: in Farbe sichtbar, im Schwarzweißdruck trotzdem hervorgehoben
	checkbox(markRight, focusBaseline, focusCap, focusCap * 1.1, 'signal', 2);
	entry(input.focus.text, focusCap, text, focusBaseline, right - text, ['focus', 'text']);
	// Der erste Schritt ist die Unterzeile der Hauptsache: kleine Beschriftung und Eintrag auf einer Grundlinie, ohne eigene Linie
	const stepBaseline = focusBaseline + row;
	const label = put('erster schritt', 'sign', headingCap, text, stepBaseline, []) + gap;
	entry(input.focus.firstStep, cap, text + label, stepBaseline, right - text - label, ['focus', 'firstStep']);
	y = stepBaseline + cap * 0.9 + gap;
	line(left, right, y);
	y += zoneGap;

	// Routinen: drei Spalten, nur was gilt. In jeder Spalte hängt das Kästchen vor dem Text; die erste beginnt an der Fluchtlinie.
	const columnGap = cap * 1.5;
	const mark = box + gap;
	const columnsFrom = text - mark;
	const column = (right - columnsFrom - 2 * columnGap) / 3;
	const routineTop = y;
	ROUTINE_BLOCKS.forEach(({ id, name }, c) => {
		const x = columnsFrom + c * (column + columnGap) + mark;
		let rowY = heading(name, x, routineTop);
		input.routines[id].slice(0, DAY_SHEET_LIMITS.routinesPerBlock).forEach((content, i) => {
			const baseline = rowY + row - cap * 0.9;
			checkbox(x - gap, baseline);
			entry(content, cap, x, baseline, column - mark, ['routines', id, i]);
			rowY += row;
		});
	});
	y = routineTop + headingCap + headingGap + DAY_SHEET_LIMITS.routinesPerBlock * row + zoneGap;

	// Außerdem: immer drei Plätze, leere bleiben zum Schreiben; rechts die Dauer
	y = heading('außerdem', text, y);
	for (let i = 0; i < DAY_SHEET_LIMITS.tasks; i++) {
		const task = input.tasks[i];
		const baseline = y + row - cap * 0.9;
		checkbox(markRight, baseline);
		const durationWidth = task?.minutes ? put(`${task.minutes} min`, 'text', cap, right, baseline, ['tasks', i, 'minutes'], 'right') + cap * 1.5 : 0;
		if (task) entry(task.text, cap, text, baseline, right - text - durationWidth, ['tasks', i, 'text']);
		line(left, right, y + row);
		y += row;
	}
	y += zoneGap;

	// Termine: die Uhrzeit hängt vor der Fluchtlinie, die Sache steht an ihr, rechts die Zeit zum Losgehen
	y = heading('termine', text, y);
	for (let i = 0; i < DAY_SHEET_LIMITS.appointments; i++) {
		const appointment = input.appointments[i];
		const baseline = y + row - cap * 0.9;
		if (appointment) {
			put(appointment.time, 'text', cap, markRight, baseline, ['appointments', i, 'time'], 'right');
			const leaveWidth = appointment.leaveAt ? put(`los ${appointment.leaveAt}`, 'text', cap, right, baseline, ['appointments', i, 'leaveAt'], 'right') + cap * 1.5 : 0;
			entry(appointment.text, cap, text, baseline, right - text - leaveWidth, ['appointments', i, 'text']);
		}
		line(left, right, y + row);
		y += row;
	}
	y += zoneGap;

	// Mitnehmen: eine Zeile
	y = heading('mitnehmen', text, y);
	entry(input.remember.join(' · '), cap, text, y + row - cap * 0.9, right - text, ['remember']);
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
	const days = order.days.map((day) => {
		const { page, hints } = layoutDaySheet(kura, day, font);
		return { page, hints, preview: paperPreview(kura, page) };
	});
	const pages = days.map((d) => d.page);
	const fileName = fileNameOf(order.days);
	return {
		/** Je Tag sein Blatt, die Hinweise dazu und das Blatt als SVG in der Druckfarbe, für die Vorschau */
		days,
		/** Je Tag ein Blatt */
		pages,
		fileName,
		file: () => paperFile(kura, pages, fileName, 'Tagesübersicht')
	};
}

const L = DAY_SHEET_LIMITS;

export const daySheet = defineProduct({
	id: 'tagesuebersicht',
	name: 'Tagesübersicht',
	medium: PAPER,
	nav: 'Tag',
	summary: 'Ein Blatt A4 für einen Tag: eine Hauptsache, Routinen, Termine. Ausprobieren und als PDF drucken.',
	href: '/tag',
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
	examples: [{ caption: 'A4 hoch', order: { days: [DAY_SHEET_EXAMPLE] } }],
	exampleView: (kura, setting) => paperExample(kura, setting.days[0].page)
});

/** Der Satz eines oder mehrerer Tage und das PDF */
export type DaySheetProof = ReturnType<typeof daySheet.set>;
