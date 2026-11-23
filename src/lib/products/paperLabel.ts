/**
 * Produkt Papierlabel: gedrucktes Etikett im Hausdesign Kura.
 * Unterregeln des Produkts: zwei Formate auf festen Bögen, je Etikett ein Wort, Unterzeile erlaubt.
 * Ein Bogen kann mehrere Etiketten tragen, jedes an seinem Platz.
 * Alles Gestalterische wird aus Kura abgeleitet.
 */
import { caseInWords, maxSignWidth, type Kura } from '$lib/kura/kura';
import { setSign, type RoleLine } from '$lib/kura/textRole';
import { PAPER, paperExample, paperFile, paperPreview } from '$lib/media/paper/medium';
import type { PrintPage } from '$lib/media/paper/page';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { fileSlug, formatMm } from '$lib/typesetting/format';
import { translatePath } from '$lib/typesetting/geometry';
import type { Rect } from '$lib/typesetting/types';
import { hint, type Hint } from './hint';
import { ok } from '$utils/result';
import { choice, defineProduct, record, type Parsed } from './product';

export const PAPER_LABEL_FORMATS = {
	/** Etikettenbogen A4 hoch mit 2 × 4 Etiketten */
	label: { width: 105, height: 74, name: 'Etikett', sheet: { width: 210, height: 297, columns: 2, rows: 4, name: 'A4 hoch' } },
	/** Ein Schild auf A5 quer, oben */
	sign: { width: 210, height: 100, name: 'Schild', sheet: { width: 210, height: 148, columns: 1, rows: 1, name: 'A5 quer' } }
} as const;

export type PaperLabelFormatId = keyof typeof PAPER_LABEL_FORMATS;

export const PAPER_LABEL_FORMAT_IDS = Object.keys(PAPER_LABEL_FORMATS) as PaperLabelFormatId[];
/** Frühere Namen der Formate bleiben für Agenten gültig */
const FORMAT_ALIASES: Record<string, PaperLabelFormatId> = { small: 'label', large: 'sign' };

export interface PaperLabelInput {
	text: string;
	subText: string;
	format: PaperLabelFormatId;
	/** Platz auf dem Bogen, zeilenweise ab 0 */
	position: number;
}

export const DEFAULT_PAPER_LABEL_INPUT: PaperLabelInput = { text: 'gewürze', subText: '', format: 'label', position: 0 };

/** Ein Bogen mit seinen Etiketten. Ein Etikett ohne `position` nimmt den ersten freien Platz. */
export interface PaperLabelOrder {
	format: PaperLabelFormatId;
	labels: (Omit<PaperLabelInput, 'format' | 'position'> & { position?: number })[];
}

export interface PaperLabelLayout {
	format: PaperLabelFormatId;
	width: number;
	height: number;
	/** Hauptzeile, danach die Unterzeile, falls vorhanden; Koordinaten im Etikett */
	lines: RoleLine[];
}

export function positionCount(format: PaperLabelFormatId): number {
	const { columns, rows } = PAPER_LABEL_FORMATS[format].sheet;
	return columns * rows;
}

/** Setzt das Etikett als Zeichen auf seiner Fläche; Maße, Satz und die Regeln dazu kommen aus Kura. */
function setLabel(kura: Kura, input: PaperLabelInput, font: LoadedFont): { layout: PaperLabelLayout; hints: Hint[] } {
	const { width, height } = PAPER_LABEL_FORMATS[input.format];
	const { lines, hints } = setSign(kura, font, { x: 0, y: 0, width, height }, { text: input.text, at: ['text'] }, { text: input.subText, at: ['subText'] });
	return { layout: { format: input.format, width, height, lines }, hints };
}

/** Platz ab 0 aus Spalte und Zeile ab 1; `null`, wenn es den Platz auf dem Bogen nicht gibt. */
export function positionAt(format: PaperLabelFormatId, column: number, row: number): number | null {
	const { columns, rows } = PAPER_LABEL_FORMATS[format].sheet;
	if (!Number.isInteger(column) || !Number.isInteger(row) || column < 1 || column > columns || row < 1 || row > rows) return null;
	return (row - 1) * columns + (column - 1);
}

/** Spalte und Zeile ab 1 zu einem Platz ab 0. */
export function placeOf(format: PaperLabelFormatId, position: number): { column: number; row: number } {
	const { columns } = PAPER_LABEL_FORMATS[format].sheet;
	return { column: (position % columns) + 1, row: Math.floor(position / columns) + 1 };
}

/** Die Fläche eines Platzes auf dem Bogen, ab der linken oberen Ecke des Bogens. Ein Platz außerhalb des Bogens gilt als erster Platz. */
export function placeArea(format: PaperLabelFormatId, position: number): Rect {
	const { sheet, width, height } = PAPER_LABEL_FORMATS[format];
	const index = position >= 0 && position < sheet.columns * sheet.rows ? Math.floor(position) : 0;
	return { x: (index % sheet.columns) * width, y: Math.floor(index / sheet.columns) * height, width, height };
}

/** Der Druckbogen mit jedem Etikett an seinem Platz. */
export function paperSheetPage(format: PaperLabelFormatId, labels: readonly { layout: PaperLabelLayout; position: number }[]): PrintPage {
	const { sheet } = PAPER_LABEL_FORMATS[format];
	return {
		width: sheet.width,
		height: sheet.height,
		items: labels.flatMap(({ layout, position }) => {
			const { x, y } = placeArea(format, position);
			return layout.lines.filter((l) => l.commands.length > 0).map((l) => ({ kind: 'fill' as const, commands: translatePath(l.commands, x, y) }));
		})
	};
}

/** Dateiname nach dem Muster papierlabel-gewuerze-105x74mm.pdf; bei mehreren Etiketten papierlabel-gewuerze-und-2-weitere-105x74mm.pdf */
function fileNameOf(text: string, format: PaperLabelFormatId, count: number): string {
	const { width, height } = PAPER_LABEL_FORMATS[format];
	return `papierlabel-${fileSlug(text)}${count > 1 ? `-und-${count - 1}-weitere` : ''}-${width}x${height}mm.pdf`;
}

/** Liest ein Etikett mit seinem Platz, falls einer genannt ist; ein Platz, den es auf dem Bogen nicht gibt, lässt das Etikett wegfallen. */
function parseLabel(raw: unknown, { format }: Omit<PaperLabelOrder, 'labels'>): Parsed<PaperLabelOrder['labels'][number]> {
	const entry = record(raw);
	const hints: Hint[] = [];
	const { columns, rows } = PAPER_LABEL_FORMATS[format].sheet;
	const places = positionCount(format);
	const hasCell = entry.column !== undefined || entry.row !== undefined;
	const named = hasCell || (entry.position !== undefined && entry.position !== null);
	const position = hasCell
		? positionAt(format, entry.column as number, entry.row as number)
		: typeof entry.position === 'number' && Number.isInteger(entry.position) && entry.position >= 1 && entry.position <= places
			? entry.position - 1
			: null;
	if (named && position === null)
		hints.push(hasCell ? hint('position', `Spalte (column) 1 bis ${columns} und Zeile (row) 1 bis ${rows} angeben.`, ['column']) : hint('position', `Platz 1 bis ${places} angeben.`, ['position']));
	const text = typeof entry.text === 'string' ? entry.text.trim() : '';
	if (!text) hints.push(hint('empty', 'Das Wort fehlt.', ['text']));
	if (entry.subText !== undefined && entry.subText !== null && typeof entry.subText !== 'string') hints.push(hint('type', 'Die Unterzeile als Text angeben.', ['subText']));
	if (!text || (named && position === null)) return { value: null, hints };
	return { value: { text, subText: typeof entry.subText === 'string' ? entry.subText : '', ...(position !== null && { position }) }, hints };
}

/** Vergibt die Plätze: erst die genannten, danach füllen die übrigen Etiketten die freien der Reihe nach. Ein Platz, der schon vergeben ist, ist ein Hinweis. */
function placeLabels(labels: PaperLabelOrder['labels']): { position: number; hints: Hint[] }[] {
	const taken = new Set<number>();
	const named = labels.map(({ position }) => {
		if (position === undefined) return { position, hints: [] };
		if (taken.has(position)) return { position, hints: [hint('position', 'Ein Etikett davor steht schon an diesem Platz. Einen anderen Platz wählen.')] };
		taken.add(position);
		return { position, hints: [] };
	});
	let next = 0;
	return named.map(({ position, hints }) => {
		if (position !== undefined) return { position, hints };
		while (taken.has(next)) next++;
		taken.add(next);
		return { position: next, hints };
	});
}

function set(kura: Kura, order: PaperLabelOrder, font: LoadedFont) {
	const places = placeLabels(order.labels);
	const labels = order.labels.map((input, i) => {
		const { layout, hints } = setLabel(kura, { ...input, format: order.format, position: places[i].position }, font);
		return { position: places[i].position, layout, hints: [...places[i].hints, ...hints] };
	});
	const page = paperSheetPage(order.format, labels);
	const first = order.labels[0]?.text.trim() ?? '';
	const fileName = labels.length > 0 ? fileNameOf(first, order.format, labels.length) : '';
	return {
		format: order.format,
		/** Je Etikett sein Platz und sein Satz, in der Reihenfolge der Bestellung */
		labels,
		/** Der Druckbogen */
		page,
		/** Der Bogen als SVG in der Druckfarbe, für die Vorschau */
		preview: paperPreview(kura, page),
		fileName,
		file: () => paperFile(kura, [page], fileName, first)
	};
}

/** Ein Beispiel: ein Etikett am ersten Platz, beschriftet mit dem Format. */
function example(format: PaperLabelFormatId, text: string, subText: string): { caption: string; order: PaperLabelOrder } {
	const { name, width, height } = PAPER_LABEL_FORMATS[format];
	return { caption: `${name} ${width} × ${height} mm`, order: { format, labels: [{ text, subText, position: 0 }] } };
}

export const paperLabel = defineProduct({
	id: 'papierlabel',
	name: 'Papierlabel',
	medium: PAPER,
	nav: 'Papier',
	summary: 'Etiketten auf dem Bogen, eines oder mehrere, jedes an seinem Platz. Als PDF drucken.',
	href: '/papier',
	order(kura) {
		const { label, sign } = PAPER_LABEL_FORMATS;
		const about = (f: (typeof PAPER_LABEL_FORMATS)[PaperLabelFormatId]) =>
			`${f.name} ${f.width} × ${f.height} mm auf ${f.sheet.name} mit ${f.sheet.columns * f.sheet.rows === 1 ? 'einem Platz' : `${f.sheet.columns * f.sheet.rows} Plätzen`}`;
		return {
			description:
				`Gedrucktes Etikett auf einem Etikettenbogen. Je Etikett ein kurzes Wort, wahlweise mit Unterzeile; Kura schreibt beides ${caseInWords(kura.sign.case)}. In Originalgröße (100 %) drucken. ` +
				'Der Platz auf dem Bogen ist wählbar, damit ein angebrochener Bogen weiter genutzt werden kann. ' +
				'Für mehrere Etiketten auf einem Bogen statt text { "format": …, "labels": [ { "text": …, "column": …, "row": … }, … ] } senden; ohne Platzangabe füllen die Etiketten die freien Plätze der Reihe nach.',
			fields: [
				{ name: 'text', type: 'string', required: true, description: `Ein kurzes Wort, beim Etikett höchstens ${formatMm(maxSignWidth(kura, label.width))} mm breit, beim Schild ${formatMm(maxSignWidth(kura, sign.width))} mm.` },
				{ name: 'subText', type: 'string', required: false, description: 'Unterzeile, etwa der Ort oder der Inhalt.' },
				{ name: 'format', type: PAPER_LABEL_FORMAT_IDS.map((id) => `"${id}"`).join(' | '), required: false, description: `label = ${about(label)} (Vorgabe), sign = ${about(sign)}.` },
				{ name: 'column, row', type: 'number, number', required: false, description: `Platz auf dem Bogen als Spalte und Zeile ab 1, von links oben; beim Etikett Spalte 1 bis ${label.sheet.columns}, Zeile 1 bis ${label.sheet.rows}.` },
				{ name: 'position', type: 'number', required: false, description: `Statt column und row: Platz ab 1, zeilenweise von links oben; beim Etikett 1 bis ${positionCount('label')}. Ohne Angabe der erste freie Platz.` },
				{ name: 'labels', type: '{ text, subText?, column?, row?, position? }[]', required: false, description: 'Mehrere Etiketten auf einem Bogen, höchstens so viele wie Plätze; ersetzt text, subText und die Platzangabe auf oberster Ebene.' }
			],
			example: { text: 'gewürze', subText: 'regal 2', format: 'label', column: 1, row: 2 }
		};
	},
	pieces: {
		list: 'labels',
		limit: ({ format }) => ({ max: positionCount(format), message: `1 bis ${positionCount(format)} Etiketten passen auf diesen Bogen.` }),
		shared: (top) => {
			const format = choice(top.format, PAPER_LABEL_FORMAT_IDS, 'label', 'format', FORMAT_ALIASES);
			return format.ok ? ok({ format: format.value }) : format;
		}
	},
	parse: parseLabel,
	set,
	examples: [example('label', 'gewürze', ''), example('sign', 'winter', 'mützen · schals')],
	// Das Beispiel zeigt das Etikett an seinem Platz, nicht den ganzen Bogen
	exampleView: (kura, setting) => paperExample(kura, setting.page, placeArea(setting.format, setting.labels[0].position))
});

/** Der Satz eines Bogens mit seinen Etiketten und das PDF */
export type PaperLabelProof = ReturnType<typeof paperLabel.set>;
