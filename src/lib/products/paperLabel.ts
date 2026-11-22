/**
 * Produkt Papierlabel: gedrucktes Etikett im Hausdesign Kura.
 * Unterregeln des Produkts: zwei Formate auf festen Bögen, je Etikett ein Wort, Unterzeile erlaubt.
 * Ein Bogen kann mehrere Etiketten tragen, jedes an seinem Platz.
 * Alles Gestalterische wird aus Kura abgeleitet.
 */
import { applyCase, maxSignWidth, signCapHeight, type Kura } from '$lib/kura/kura';
import type { PrintPage } from '$lib/media/paper/page';
import { setBlock, type PlacedLine } from '$lib/typesetting/block';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { formatMm } from '$lib/typesetting/format';
import { translatePath } from '$lib/typesetting/geometry';
import type { Hint } from './hint';

export const PAPER_LABEL_FORMATS = {
	/** Etikettenbogen A4 hoch mit 2 × 4 Etiketten */
	small: { width: 105, height: 74, name: 'Etikett', sheet: { width: 210, height: 297, columns: 2, rows: 4, name: 'A4 hoch' } },
	/** Ein Schild auf A5 quer, oben */
	large: { width: 210, height: 100, name: 'Schild', sheet: { width: 210, height: 148, columns: 1, rows: 1, name: 'A5 quer' } }
} as const;

export type PaperLabelFormatId = keyof typeof PAPER_LABEL_FORMATS;

export interface PaperLabelInput {
	text: string;
	subText: string;
	format: PaperLabelFormatId;
	/** Platz auf dem Bogen, zeilenweise ab 0 */
	position: number;
}

export const DEFAULT_PAPER_LABEL_INPUT: PaperLabelInput = { text: 'gewürze', subText: '', format: 'small', position: 0 };

export interface PaperLabelLayout {
	format: PaperLabelFormatId;
	width: number;
	height: number;
	/** Hauptzeile, danach die Unterzeile, falls vorhanden; Koordinaten im Etikett */
	lines: PlacedLine[];
}

export function positionCount(format: PaperLabelFormatId): number {
	const { columns, rows } = PAPER_LABEL_FORMATS[format].sheet;
	return columns * rows;
}

/** Setzt das Etikett: Maße und Satz kommen aus Kura. */
export function layoutPaperLabel(kura: Kura, input: PaperLabelInput, font: LoadedFont): PaperLabelLayout {
	const { width, height } = PAPER_LABEL_FORMATS[input.format];
	const capHeight = signCapHeight(kura, width, height);
	const role = { trackingPercent: kura.sign.trackingPercent };
	const text = applyCase(kura.sign.case, input.text.trim());
	const subText = applyCase(kura.sign.case, input.subText.trim());
	const specs = [{ text, capHeight, ...role }, ...(subText ? [{ text: subText, capHeight: capHeight * kura.subLine.capRatio, ...role }] : [])];
	const lines = setBlock(font, specs, kura.subLine.lineSpacing * capHeight, { x: 0, y: 0, width, height }, kura.sign.align);
	return { format: input.format, width, height, lines };
}

export function checkPaperLabel(kura: Kura, layout: PaperLabelLayout): Hint[] {
	const limit = maxSignWidth(kura, layout.width);
	return layout.lines.flatMap((line, i): Hint[] =>
		line.width > limit + 1e-6
			? [
					{
						kind: i === 0 ? 'sign-width' : 'sub-width',
						message: `${i === 0 ? 'Das Wort' : 'Die Unterzeile'} ist ${formatMm(line.width)} mm breit, Kura lässt auf diesem Format höchstens ${formatMm(limit)} mm zu. Kürzer fassen.`
					}
				]
			: []
	);
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

/** Der Druckbogen mit einem einzelnen Etikett an seinem Platz. */
export function paperLabelPage(layout: PaperLabelLayout, position: number): PrintPage {
	return paperSheetPage(layout.format, [{ layout, position }]);
}

/** Dateiname nach dem Muster papierlabel-gewuerze-105x74mm.pdf; bei mehreren Etiketten papierlabel-gewuerze-und-2-weitere-105x74mm.pdf */
export function paperLabelFileName(input: Pick<PaperLabelInput, 'text' | 'format'>, count = 1): string {
	const { width, height } = PAPER_LABEL_FORMATS[input.format];
	const more = count > 1 ? `-und-${count - 1}-weitere` : '';
	const slug =
		input.text
			.trim()
			.toLowerCase()
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe')
			.replace(/ü/g, 'ue')
			.replace(/ß/g, 'ss')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'label';
	return `papierlabel-${slug}${more}-${width}x${height}mm.pdf`;
}
