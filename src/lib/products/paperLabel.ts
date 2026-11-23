/**
 * Produkt Papierlabel: gedrucktes Etikett im Hausdesign Kura.
 * Unterregeln des Produkts: zwei Formate auf festen Bögen, je Etikett ein Wort, Unterzeile erlaubt.
 * Ein Bogen kann mehrere Etiketten tragen, jedes an seinem Platz.
 * Alles Gestalterische wird aus Kura abgeleitet.
 */
import { maxSignWidth, type Kura } from '$lib/kura/kura';
import { setSign, type RoleLine } from '$lib/kura/textRole';
import type { PrintPage } from '$lib/media/paper/page';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { pageSvg } from '$lib/media/paper/page';
import { fileSlug, formatMm } from '$lib/typesetting/format';
import { translatePath } from '$lib/typesetting/geometry';
import { hint, within, type Hint } from './hint';
import { choice, defineProduct, record, type Parsed, type ProductExample, type Proof } from './product';

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

/** Ein Bogen mit seinen Etiketten, jedes an seinem Platz. `many`: Der Inhalt kam als Liste `labels`; Hinweise nennen dann das Etikett. */
export interface PaperLabelOrder {
	format: PaperLabelFormatId;
	many: boolean;
	/** `index`: Stelle des Etiketts im Inhalt, falls sie nicht die Stelle in dieser Liste ist */
	labels: (Omit<PaperLabelInput, 'format'> & { index?: number })[];
}

export interface PaperLabelProof extends Proof {
	format: PaperLabelFormatId;
	/** Je Etikett sein Platz und sein Satz, in der Reihenfolge des Inhalts */
	labels: { position: number; layout: PaperLabelLayout; hints: Hint[] }[];
	/** Der Druckbogen */
	page: PrintPage;
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

/** Der Druckbogen mit jedem Etikett an seinem Platz. Ein Platz außerhalb des Bogens gilt als erster Platz. */
export function paperSheetPage(format: PaperLabelFormatId, labels: readonly { layout: PaperLabelLayout; position: number }[]): PrintPage {
	const { sheet, width, height } = PAPER_LABEL_FORMATS[format];
	return {
		width: sheet.width,
		height: sheet.height,
		items: labels.flatMap(({ layout, position }) => {
			const index = position >= 0 && position < sheet.columns * sheet.rows ? Math.floor(position) : 0;
			const dx = (index % sheet.columns) * width;
			const dy = Math.floor(index / sheet.columns) * height;
			return layout.lines.filter((l) => l.commands.length > 0).map((l) => ({ kind: 'fill' as const, commands: translatePath(l.commands, dx, dy) }));
		})
	};
}

/** Dateiname nach dem Muster papierlabel-gewuerze-105x74mm.pdf; bei mehreren Etiketten papierlabel-gewuerze-und-2-weitere-105x74mm.pdf */
function fileNameOf(text: string, format: PaperLabelFormatId, count: number): string {
	const { width, height } = PAPER_LABEL_FORMATS[format];
	return `papierlabel-${fileSlug(text)}${count > 1 ? `-und-${count - 1}-weitere` : ''}-${width}x${height}mm.pdf`;
}

/** Liest den Inhalt und vergibt die Plätze: erst die genannten, danach füllen die übrigen Etiketten die freien der Reihe nach. */
function parse(raw: unknown): Parsed<PaperLabelOrder> {
	const source = record(raw);
	const chosen = choice(source.format, PAPER_LABEL_FORMAT_IDS, 'label', 'format', FORMAT_ALIASES);
	if (!chosen.ok) return { order: null, hints: chosen.error };
	const format = chosen.value;
	const many = Array.isArray(source.labels);
	const entries = many ? (source.labels as unknown[]).map(record) : [source];
	const { columns, rows } = PAPER_LABEL_FORMATS[format].sheet;
	const places = positionCount(format);
	if (entries.length === 0 || entries.length > places) return { order: null, hints: [hint('too-many', `1 bis ${places} Etiketten passen auf diesen Bogen.`, ['labels'])] };
	const hints: Hint[] = [];
	const here = (i: number, found: Hint[]) => hints.push(...(many ? within(['labels', i], found) : found));
	const taken = new Map<number, number>();
	const named = entries.map((entry, i): number | null => {
		const hasCell = entry.column !== undefined || entry.row !== undefined;
		if (!hasCell && (entry.position === undefined || entry.position === null)) return null;
		const place = hasCell
			? positionAt(format, entry.column as number, entry.row as number)
			: typeof entry.position === 'number' && Number.isInteger(entry.position) && entry.position >= 1 && entry.position <= places
				? entry.position - 1
				: null;
		if (place === null) {
			here(i, [hasCell ? hint('position', `Spalte (column) 1 bis ${columns} und Zeile (row) 1 bis ${rows} angeben.`, ['column']) : hint('position', `Platz 1 bis ${places} angeben.`, ['position'])]);
			return -1;
		}
		if (taken.has(place)) hints.push(hint('position', `Der Platz ist schon durch labels[${taken.get(place)}] belegt. Einen anderen Platz wählen.`, ['labels', i]));
		else taken.set(place, i);
		return place;
	});
	let next = 0;
	const labels = entries.flatMap((entry, i) => {
		const text = typeof entry.text === 'string' ? entry.text.trim() : '';
		if (!text) here(i, [hint('empty', 'Das Wort fehlt.', ['text'])]);
		if (entry.subText !== undefined && entry.subText !== null && typeof entry.subText !== 'string') here(i, [hint('type', 'Die Unterzeile als Text angeben.', ['subText'])]);
		let position = named[i];
		if (position === null) {
			while (taken.has(next)) next++;
			position = next;
			taken.set(position, i);
		}
		return text && position >= 0 ? [{ text, subText: typeof entry.subText === 'string' ? entry.subText : '', position, index: i }] : [];
	});
	return { order: labels.length > 0 ? { format, many, labels } : null, hints };
}

function set(kura: Kura, order: PaperLabelOrder, font: LoadedFont): PaperLabelProof {
	const labels = order.labels.map((input, i) => {
		const { layout, hints: found } = setLabel(kura, { ...input, format: order.format }, font);
		return { position: input.position, layout, hints: order.many ? within(['labels', input.index ?? i], found) : found };
	});
	const page = paperSheetPage(order.format, labels);
	const first = order.labels[0]?.text.trim() ?? '';
	const fileName = labels.length > 0 ? fileNameOf(first, order.format, labels.length) : '';
	return {
		format: order.format,
		labels,
		page,
		hints: labels.flatMap((l) => l.hints),
		fileName,
		async file() {
			// Die PDF-Bibliothek erst laden, wenn gedruckt wird
			const { renderPdf } = await import('$lib/media/paper/pdf');
			return { fileName, mime: 'application/pdf', body: await renderPdf([page], kura.paper.ink, first) };
		}
	};
}

function example(kura: Kura, font: LoadedFont, input: Pick<PaperLabelInput, 'text' | 'subText' | 'format'>): ProductExample {
	const { layout, hints } = setLabel(kura, { ...input, position: 0 }, font);
	const single = { width: layout.width, height: layout.height, items: layout.lines.filter((l) => l.commands.length > 0).map((l) => ({ kind: 'fill' as const, commands: l.commands })) };
	const format = PAPER_LABEL_FORMATS[input.format];
	return { caption: `${format.name} ${format.width} × ${format.height} mm`, svg: pageSvg(single, kura.paper.ink), width: layout.width, height: layout.height, hints };
}

export const paperLabel = defineProduct({
	id: 'papierlabel',
	name: 'Papierlabel',
	medium: 'Papier-Druck',
	nav: 'Papier',
	summary: 'Etiketten auf dem Bogen, eines oder mehrere, jedes an seinem Platz. Als PDF drucken.',
	href: '/papier',
	output: 'PDF',
	order(kura) {
		const { label, sign } = PAPER_LABEL_FORMATS;
		const about = (f: (typeof PAPER_LABEL_FORMATS)[PaperLabelFormatId]) =>
			`${f.name} ${f.width} × ${f.height} mm auf ${f.sheet.name} mit ${f.sheet.columns * f.sheet.rows === 1 ? 'einem Platz' : `${f.sheet.columns * f.sheet.rows} Plätzen`}`;
		return {
			description:
				`Gedrucktes Etikett auf einem Etikettenbogen. Je Etikett ein kurzes Wort, wahlweise mit Unterzeile; Kura schreibt beides ${kura.sign.case === 'upper' ? 'groß' : 'klein'}. In Originalgröße (100 %) drucken. ` +
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
	parse,
	set,
	examples: (kura, font) => [example(kura, font, { text: 'gewürze', subText: '', format: 'label' }), example(kura, font, { text: 'winter', subText: 'mützen · schals', format: 'sign' })]
});
