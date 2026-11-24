/**
 * Medium Papier-Druck: aus den Seiten, die ein Produkt gesetzt hat, werden die Vorschau, das PDF
 * und die Beispielansicht, alle in den Farben aus Kura (Ausprägung `paper`: Druckfarbe und Signalfarbe).
 */
import type { Kura } from '$lib/kura/kura';
import { svgPathData } from '$lib/typesetting/geometry';
import type { Rect } from '$lib/typesetting/types';
import type { ExampleViewBase, Medium, MediumFile } from '../medium';
import { toneColor, type PrintPage } from './page';

export const PAPER = { id: 'paper', name: 'Papier-Druck', output: 'PDF', mime: 'application/pdf' } as const satisfies Medium;

/** Ein Blatt auf dem Tisch: weiß, mit feiner Kante, vor Sand. */
export interface PaperExampleView extends ExampleViewBase {
	medium: typeof PAPER.id;
	svg: string;
}

/**
 * Die Seite als SVG, 1 Einheit = 1 mm, in den Farben aus Kura; für die Vorschau im Browser.
 * `part` zeigt nur einen Ausschnitt der Seite, etwa ein Etikett des Bogens.
 */
export function paperPreview(kura: Kura, page: PrintPage, part: Rect = { x: 0, y: 0, width: page.width, height: page.height }): string {
	const shapes = page.items.map((item) => {
		const color = toneColor(kura.paper, item.tone);
		return item.kind === 'fill'
			? `<path fill="${color}" d="${svgPathData(item.commands)}"/>`
			: `<path fill="none" stroke="${color}" stroke-width="${item.widthMm}" d="${svgPathData(item.commands)}"/>`;
	});
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${part.x} ${part.y} ${part.width} ${part.height}">${shapes.join('')}</svg>`;
}

/** Das PDF mit einer Seite je `PrintPage`. Die PDF-Bibliothek wird erst geladen, wenn gedruckt wird. */
export async function paperFile(kura: Kura, pages: readonly PrintPage[], fileName: string, title: string): Promise<MediumFile> {
	const { renderPdf } = await import('./pdf');
	return { fileName, mime: PAPER.mime, body: await renderPdf(kura, pages, title) };
}

/** Das Beispiel als Blatt auf Sand; `part` wie bei der Vorschau. */
export function paperExample(kura: Kura, page: PrintPage, part?: Rect): PaperExampleView {
	return {
		medium: PAPER.id,
		width: part?.width ?? page.width,
		height: part?.height ?? page.height,
		backdrop: 'var(--color-sand)',
		svg: paperPreview(kura, page, part)
	};
}
