/**
 * Bestellbare Produkte: was ein Agent über das Produkt wissen muss und wie aus seinem Inhalt eine Datei wird.
 * Ein Inhalt, der eine Regel verletzt, ergibt keine Datei, sondern Hinweise, was zu ändern ist.
 */
import type { Kura } from '$lib/kura/kura';
import { renderPdf } from '$lib/media/paper/pdf';
import { layoutLabel } from '$lib/media/wood/layout';
import { buildSvg, exportFileName } from '$lib/media/wood/svgExport';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { err, ok, type Result } from '$utils/result';
import { DAY_SHEET_EXAMPLE, DAY_SHEET_LIMITS, daySheetFileName, layoutDaySheet, parseDaySheet, type DaySheetInput } from './daySheet';
import type { Hint } from './hint';
import { checkPaperLabel, layoutPaperLabel, PAPER_LABEL_FORMATS, paperLabelFileName, paperLabelPage, positionCount, type PaperLabelFormatId } from './paperLabel';
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

function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T, field: string): Result<T, Hint[]> {
	if (value === undefined || value === null || value === '') return ok(fallback);
	return allowed.includes(value as T) ? ok(value as T) : err([{ kind: 'choice', message: `${field}: erlaubt sind ${allowed.join(', ')}.` }]);
}

const woodLabel: Orderable = {
	spec: {
		id: 'holzlabel',
		name: 'Holzlabel',
		medium: 'Lärche-Gravur',
		output: 'SVG',
		description:
			'Türlabel aus 4 mm Lärche für den Laser. Ein einzelnes kurzes Wort; Kura schreibt es klein. Die SVG enthält die Ebenen Gravur (schwarz) und Schnitt (rot), 1 Einheit = 1 mm.',
		fields: [
			{ name: 'text', type: 'string', required: true, description: 'Ein kurzes Wort, im Serienformat höchstens 45 mm breit (etwa 8 Buchstaben).' },
			{ name: 'format', type: '"standard" | "long"', required: false, description: 'standard = Serie 64 × 24 mm (Vorgabe), long = 90 × 24 mm nur für ein unverzichtbar langes Wort.' }
		],
		example: { text: 'teller' }
	},
	async make(kura, content, font) {
		const source = record(content);
		const text = word(source);
		const format = choice<WoodLabelFormatId>(source.format, Object.keys(WOOD_LABEL_FORMATS) as WoodLabelFormatId[], 'standard', 'format');
		if (!text.ok || !format.ok) return err([...(text.ok ? [] : text.error), ...(format.ok ? [] : format.error)]);
		const settings = woodLabelSettings(kura, { ...DEFAULT_WOOD_LABEL_INPUT, text: text.value, format: format.value });
		const layout = layoutLabel(settings, font);
		const hints = checkWoodLabel(kura, layout, settings);
		if (hints.length > 0) return err(hints);
		return ok({ fileName: exportFileName(settings, layout), mime: 'image/svg+xml', body: buildSvg(layout, settings) });
	}
};

const paperLabel: Orderable = {
	spec: {
		id: 'papierlabel',
		name: 'Papierlabel',
		medium: 'Papier-Druck',
		output: 'PDF',
		description:
			'Gedrucktes Etikett auf einem Etikettenbogen. Ein kurzes Wort, wahlweise mit Unterzeile; Kura schreibt beides klein. In Originalgröße (100 %) drucken.',
		fields: [
			{ name: 'text', type: 'string', required: true, description: 'Ein kurzes Wort.' },
			{ name: 'subText', type: 'string', required: false, description: 'Unterzeile, etwa der Ort oder der Inhalt.' },
			{ name: 'format', type: '"small" | "large"', required: false, description: 'small = Etikett 105 × 74 mm auf A4 hoch mit 8 Plätzen (Vorgabe), large = Schild 210 × 100 mm auf A5 quer.' },
			{ name: 'position', type: 'number', required: false, description: 'Platz auf dem Bogen ab 1, zeilenweise von links oben; bei small 1 bis 8. Vorgabe 1.' }
		],
		example: { text: 'gewürze', subText: 'regal 2', format: 'small', position: 1 }
	},
	async make(kura, content, font) {
		const source = record(content);
		const text = word(source);
		const format = choice<PaperLabelFormatId>(source.format, Object.keys(PAPER_LABEL_FORMATS) as PaperLabelFormatId[], 'small', 'format');
		if (!text.ok || !format.ok) return err([...(text.ok ? [] : text.error), ...(format.ok ? [] : format.error)]);
		const places = positionCount(format.value);
		const place = source.position === undefined || source.position === null ? 1 : source.position;
		if (typeof place !== 'number' || !Number.isInteger(place) || place < 1 || place > places)
			return err([{ kind: 'position', message: `position: Platz 1 bis ${places} angeben.` }]);
		const input = { text: text.value, subText: typeof source.subText === 'string' ? source.subText : '', format: format.value, position: place - 1 };
		const layout = layoutPaperLabel(kura, input, font);
		const hints = checkPaperLabel(kura, layout);
		if (hints.length > 0) return err(hints);
		const body = await renderPdf([paperLabelPage(layout, input.position)], kura.paper.ink, input.text);
		return ok({ fileName: paperLabelFileName(input), mime: 'application/pdf', body });
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
