/**
 * Bestellbare Produkte: was ein Agent über das Produkt wissen muss und wie aus seinem Inhalt eine Datei wird.
 * Ein Inhalt, der eine Regel verletzt, ergibt keine Datei, sondern Hinweise, was zu ändern ist.
 */
import type { Kura } from '$lib/kura/kura';
import { renderPdf } from '$lib/media/paper/pdf';
import { layoutLabel } from '$lib/media/wood/layout';
import { calibration } from '$lib/media/wood/calibration';
import { buildSheetSvg, exportFileName, type SheetLabel } from '$lib/media/wood/svgExport';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { err, ok, type Result } from '$utils/result';
import { DAY_SHEET_EXAMPLE, DAY_SHEET_LIMITS, daySheetFileName, layoutDaySheet, parseDaySheet, type DaySheetInput } from './daySheet';
import type { Hint } from './hint';
import { checkPaperLabel, layoutPaperLabel, PAPER_LABEL_FORMATS, paperLabelFileName, paperSheetPage, positionAt, positionCount, type PaperLabelFormatId, type PaperLabelLayout } from './paperLabel';
import { checkWoodLabel, DEFAULT_WOOD_LABEL_INPUT, WOOD_LABEL_FORMATS, woodLabelSettings, type WoodLabelFormatId } from './woodLabel';

export interface OrderField {
	name: string;
	type: string;
	required: boolean;
	description: string;
}

export interface OrderSpec {
	id: string;
	name: string;
	medium: string;
	/** Dateiformat des Ergebnisses */
	output: 'PDF' | 'SVG';
	description: string;
	fields: OrderField[];
	/** Ein gültiger Inhalt als Vorlage */
	example: unknown;
}

export interface OrderFile {
	fileName: string;
	mime: string;
	body: Uint8Array | string;
}

interface Orderable {
	spec: OrderSpec;
	make(kura: Kura, content: unknown, font: LoadedFont): Promise<Result<OrderFile, Hint[]>>;
}

const MAX_DAYS = 7;

function record(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function word(content: Record<string, unknown>): Result<string, Hint[]> {
	const text = typeof content.text === 'string' ? content.text.trim() : '';
	return text ? ok(text) : err([{ kind: 'empty', message: 'text: Das Wort fehlt.' }]);
}

/** Wahl aus festen Werten; `aliases` hält frühere Namen gültig. */
function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T, field: string, aliases: Record<string, T> = {}): Result<T, Hint[]> {
	if (value === undefined || value === null || value === '') return ok(fallback);
	if (typeof value === 'string' && value in aliases) return ok(aliases[value]);
	return allowed.includes(value as T) ? ok(value as T) : err([{ kind: 'choice', message: `${field}: erlaubt sind ${allowed.join(', ')}.` }]);
}

const woodLabel: Orderable = {
	spec: {
		id: 'holzlabel',
		name: 'Holzlabel',
		medium: 'Lärche-Gravur',
		output: 'SVG',
		description:
			'Türlabel aus 4 mm Lärche für den Laser. Je Label ein einzelnes kurzes Wort; Kura schreibt es klein. Die SVG enthält die Ebenen Gravur (schwarz) und Schnitt (rot), 1 Einheit = 1 mm. ' +
			`Für mehrere Labels in einer Datei statt text { "labels": [ { "text": … }, … ] } senden, höchstens ${calibration.laserSheet.maxLabels}; sie stehen untereinander mit ${calibration.laserSheet.gapMm} mm Abstand.`,
		fields: [
			{ name: 'text', type: 'string', required: true, description: 'Ein kurzes Wort, im Serienformat höchstens 45 mm breit (etwa 8 Buchstaben).' },
			{ name: 'format', type: '"series" | "long"', required: false, description: 'series = Serienformat 64 × 24 mm (Vorgabe), long = Langformat 90 × 24 mm nur für ein unverzichtbar langes Wort.' },
			{ name: 'labels', type: '{ text, format? }[]', required: false, description: 'Mehrere Labels in einer Datei; ersetzt text auf oberster Ebene. format auf oberster Ebene gilt für jedes Label ohne eigenes format.' }
		],
		example: { text: 'teller' }
	},
	async make(kura, content, font) {
		const source = record(content);
		const many = Array.isArray(source.labels);
		const raw = many ? (source.labels as unknown[]).map(record) : [source];
		const limit = calibration.laserSheet.maxLabels;
		if (raw.length === 0 || raw.length > limit) return err([{ kind: 'too-many', message: `labels: 1 bis ${limit} Labels je Datei.` }]);
		const at = (i: number, message: string) => (many ? `labels[${i}]: ${message}` : message);
		const hints: Hint[] = [];
		const labels: SheetLabel[] = [];
		raw.forEach((label, i) => {
			const text = word(label);
			const format = choice<WoodLabelFormatId>(label.format ?? source.format, Object.keys(WOOD_LABEL_FORMATS) as WoodLabelFormatId[], 'series', 'format', { standard: 'series' });
			if (!text.ok || !format.ok) {
				hints.push(...[...(text.ok ? [] : text.error), ...(format.ok ? [] : format.error)].map((h) => ({ ...h, message: at(i, h.message) })));
				return;
			}
			const settings = woodLabelSettings(kura, { ...DEFAULT_WOOD_LABEL_INPUT, text: text.value, format: format.value });
			const layout = layoutLabel(settings, font);
			hints.push(...checkWoodLabel(kura, layout, settings).map((h) => ({ ...h, message: at(i, h.message) })));
			labels.push({ layout, settings });
		});
		if (hints.length > 0) return err(hints);
		return ok({ fileName: exportFileName(labels[0].settings, labels[0].layout, labels.length), mime: 'image/svg+xml', body: buildSheetSvg(labels) });
	}
};

const paperLabel: Orderable = {
	spec: {
		id: 'papierlabel',
		name: 'Papierlabel',
		medium: 'Papier-Druck',
		output: 'PDF',
		description:
			'Gedrucktes Etikett auf einem Etikettenbogen. Je Etikett ein kurzes Wort, wahlweise mit Unterzeile; Kura schreibt beides klein. In Originalgröße (100 %) drucken. ' +
			'Der Platz auf dem Bogen ist wählbar, damit ein angebrochener Bogen weiter genutzt werden kann. ' +
			'Für mehrere Etiketten auf einem Bogen statt text { "format": …, "labels": [ { "text": …, "column": …, "row": … }, … ] } senden; ohne Platzangabe füllen die Etiketten die freien Plätze der Reihe nach.',
		fields: [
			{ name: 'text', type: 'string', required: true, description: 'Ein kurzes Wort.' },
			{ name: 'subText', type: 'string', required: false, description: 'Unterzeile, etwa der Ort oder der Inhalt.' },
			{ name: 'format', type: '"label" | "sign"', required: false, description: 'label = Etikett 105 × 74 mm auf A4 hoch mit 8 Plätzen (Vorgabe), sign = Schild 210 × 100 mm auf A5 quer.' },
			{ name: 'column, row', type: 'number, number', required: false, description: 'Platz auf dem Bogen als Spalte und Zeile ab 1, von links oben; beim Etikett Spalte 1 bis 2, Zeile 1 bis 4.' },
			{ name: 'position', type: 'number', required: false, description: 'Statt column und row: Platz ab 1, zeilenweise von links oben; beim Etikett 1 bis 8. Ohne Angabe der erste freie Platz.' },
			{ name: 'labels', type: '{ text, subText?, column?, row?, position? }[]', required: false, description: 'Mehrere Etiketten auf einem Bogen, höchstens so viele wie Plätze; ersetzt text, subText und die Platzangabe auf oberster Ebene.' }
		],
		example: { text: 'gewürze', subText: 'regal 2', format: 'label', column: 1, row: 2 }
	},
	async make(kura, content, font) {
		const source = record(content);
		const format = choice<PaperLabelFormatId>(source.format, Object.keys(PAPER_LABEL_FORMATS) as PaperLabelFormatId[], 'label', 'format', { small: 'label', large: 'sign' });
		if (!format.ok) return err(format.error);
		const many = Array.isArray(source.labels);
		const raw = many ? (source.labels as unknown[]).map(record) : [source];
		const { columns, rows } = PAPER_LABEL_FORMATS[format.value].sheet;
		const places = positionCount(format.value);
		if (raw.length === 0 || raw.length > places) return err([{ kind: 'too-many', message: `labels: 1 bis ${places} Etiketten passen auf diesen Bogen.` }]);
		const at = (i: number, field: string) => (many ? `labels[${i}].${field}` : field);
		const hints: Hint[] = [];
		// Erst die genannten Plätze; danach füllen die übrigen Etiketten die freien der Reihe nach
		const taken = new Map<number, number>();
		const named = raw.map((label, i): number | null => {
			const hasCell = label.column !== undefined || label.row !== undefined;
			if (!hasCell && (label.position === undefined || label.position === null)) return null;
			const place = hasCell
				? positionAt(format.value, label.column as number, label.row as number)
				: typeof label.position === 'number' && Number.isInteger(label.position) && label.position >= 1 && label.position <= places
					? label.position - 1
					: null;
			if (place === null) {
				hints.push({
					kind: 'position',
					message: hasCell ? `${at(i, 'column')}, ${at(i, 'row')}: Spalte 1 bis ${columns} und Zeile 1 bis ${rows} angeben.` : `${at(i, 'position')}: Platz 1 bis ${places} angeben.`
				});
				return -1;
			}
			if (taken.has(place)) hints.push({ kind: 'position', message: `labels[${i}]: Der Platz ist schon durch labels[${taken.get(place)}] belegt. Einen anderen Platz wählen.` });
			else taken.set(place, i);
			return place;
		});
		let next = 0;
		let first = '';
		const placed: { layout: PaperLabelLayout; position: number }[] = [];
		raw.forEach((label, i) => {
			const text = word(label);
			if (!text.ok) {
				hints.push(...text.error.map((h) => ({ ...h, message: at(i, h.message) })));
				return;
			}
			let place = named[i];
			if (place === null) {
				while (taken.has(next)) next++;
				place = next;
				taken.set(place, i);
			}
			const input = { text: text.value, subText: typeof label.subText === 'string' ? label.subText : '', format: format.value, position: place };
			const layout = layoutPaperLabel(kura, input, font);
			hints.push(...checkPaperLabel(kura, layout).map((h) => (many ? { ...h, message: `labels[${i}]: ${h.message}` } : h)));
			placed.push({ layout, position: place });
			first ||= text.value;
		});
		if (hints.length > 0) return err(hints);
		const body = await renderPdf([paperSheetPage(format.value, placed)], kura.paper.ink, first);
		return ok({ fileName: paperLabelFileName({ text: first, format: format.value }, placed.length), mime: 'application/pdf', body });
	}
};

const L = DAY_SHEET_LIMITS;

const daySheet: Orderable = {
	spec: {
		id: 'tagesuebersicht',
		name: 'Tagesübersicht',
		medium: 'Papier-Druck',
		output: 'PDF',
		description:
			'Ein Blatt A4 hochkant für einen Tag: eine Hauptsache mit kleinstem ersten Schritt, feste Routinen, wenige weitere Aufgaben, Termine, Mitnehmen. ' +
			'Jeder Eintrag ist eine kurze Zeile; zu lange Einträge werden abgelehnt und müssen gekürzt werden. Die Obergrenzen sind Absicht: Was nicht aufs Blatt passt, gehört nicht in diesen Tag. ' +
			`Für mehrere Tage statt eines Tages { "days": [ … ] } mit höchstens ${MAX_DAYS} Tagen senden; das ergibt ein PDF mit einer Seite je Tag. Das System merkt sich nichts: Jeder Aufruf enthält den vollständigen Inhalt einschließlich der Routinen.`,
		fields: [
			{ name: 'date', type: 'string', required: true, description: 'Tag als JJJJ-MM-TT.' },
			{ name: 'focus.text', type: 'string', required: false, description: 'Heute wichtig: genau eine Sache.' },
			{ name: 'focus.firstStep', type: 'string', required: false, description: 'Die kleinste konkrete erste Handlung dazu, etwa „Laptop aufklappen, Datei öffnen“.' },
			{ name: 'routines.morning | routines.midday | routines.evening', type: 'string[]', required: false, description: `Feste Routinen je Tagesabschnitt, je höchstens ${L.routinesPerBlock}, jeweils zwei bis drei Wörter.` },
			{ name: 'tasks', type: '{ text: string, minutes?: number }[]', required: false, description: `Weitere Aufgaben, höchstens ${L.tasks}; minutes ist die geschätzte Dauer.` },
			{ name: 'appointments', type: '{ time: "HH:MM", text: string, leaveAt?: "HH:MM" }[]', required: false, description: `Termine, höchstens ${L.appointments}; leaveAt ist die Zeit zum Losgehen.` },
			{ name: 'remember', type: 'string[]', required: false, description: `Mitnehmen, höchstens ${L.remember} Dinge, zusammen eine Zeile.` }
		],
		example: DAY_SHEET_EXAMPLE
	},
	async make(kura, content, font) {
		const source = record(content);
		const rawDays = Array.isArray(source.days) ? source.days : [content];
		if (rawDays.length === 0 || rawDays.length > MAX_DAYS) return err([{ kind: 'too-many', message: `days: 1 bis ${MAX_DAYS} Tage angeben.` }]);
		const prefix = (i: number, hint: Hint): Hint => (Array.isArray(source.days) ? { ...hint, message: `days[${i}].${hint.message}` } : hint);
		const hints: Hint[] = [];
		const days: DaySheetInput[] = [];
		rawDays.forEach((raw, i) => {
			const parsed = parseDaySheet(raw);
			if (parsed.ok) days.push(parsed.value);
			else hints.push(...parsed.error.map((h) => prefix(i, h)));
		});
		if (hints.length > 0) return err(hints);
		const sheets = days.map((day, i) => {
			const sheet = layoutDaySheet(kura, day, font);
			hints.push(...sheet.hints.map((h) => prefix(i, h)));
			return sheet.page;
		});
		if (hints.length > 0) return err(hints);
		const fileName = days.length === 1 ? daySheetFileName(days[0]) : `tagesuebersicht-${days[0].date}-bis-${days[days.length - 1].date}.pdf`;
		return ok({ fileName, mime: 'application/pdf', body: await renderPdf(sheets, kura.paper.ink, 'Tagesübersicht') });
	}
};

const ORDERABLE: readonly Orderable[] = [woodLabel, paperLabel, daySheet];

/** Alle bestellbaren Produkte mit dem, was ein Agent für eine Bestellung wissen muss. */
export function listProducts(): OrderSpec[] {
	return ORDERABLE.map((o) => o.spec);
}

/** Erzeugt die Datei eines Produkts oder nennt, was am Inhalt zu ändern ist. */
export function makeProduct(kura: Kura, id: string, content: unknown, font: LoadedFont): Promise<Result<OrderFile, Hint[]>> {
	const product = ORDERABLE.find((o) => o.spec.id === id);
	if (!product) return Promise.resolve(err([{ kind: 'product', message: `Unbekanntes Produkt „${id}“. Es gibt: ${ORDERABLE.map((o) => o.spec.id).join(', ')}.` }]));
	return product.make(kura, content, font);
}
