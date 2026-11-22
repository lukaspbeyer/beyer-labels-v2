/**
 * Medium Papier-Druck: eine Seite als Liste von Vektorformen in mm (y nach unten).
 * Text ist immer schon in Konturen umgewandelt; gedruckt wird in einer Farbe.
 */
import { svgPathData } from '$lib/typesetting/geometry';
import type { PathCommand } from '$lib/typesetting/types';

export type PrintItem =
	| { kind: 'fill'; commands: PathCommand[] }
	| { kind: 'stroke'; commands: PathCommand[]; widthMm: number };

export interface PrintPage {
	width: number;
	height: number;
	items: PrintItem[];
}

export const PAPER_SIZES = {
	'A4 hoch': { width: 210, height: 297 },
	'A5 quer': { width: 210, height: 148 }
} as const;

/** Die Seite als SVG, 1 Einheit = 1 mm; für die Vorschau im Browser. */
export function pageSvg(page: PrintPage, ink: string): string {
	const shapes = page.items.map((item) =>
		item.kind === 'fill'
			? `<path fill="${ink}" d="${svgPathData(item.commands)}"/>`
			: `<path fill="none" stroke="${ink}" stroke-width="${item.widthMm}" d="${svgPathData(item.commands)}"/>`
	);
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}">${shapes.join('')}</svg>`;
}
