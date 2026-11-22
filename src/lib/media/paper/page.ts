/**
 * Medium Papier-Druck: eine Seite als Liste von Vektorformen in mm (y nach unten).
 * Text ist immer schon in Konturen umgewandelt; gedruckt wird in einer Farbe.
 * Eine Form kann in einem helleren Tonwert derselben Farbe stehen; der Drucker rastert ihn.
 */
import { svgPathData } from '$lib/typesetting/geometry';
import type { PathCommand } from '$lib/typesetting/types';

export type PrintItem =
	| { kind: 'fill'; commands: PathCommand[]; tone?: number }
	| { kind: 'stroke'; commands: PathCommand[]; widthMm: number; tone?: number };

export interface PrintPage {
	width: number;
	height: number;
	items: PrintItem[];
}

export const PAPER_SIZES = {
	'A4 hoch': { width: 210, height: 297 },
	'A5 quer': { width: 210, height: 148 }
} as const;

/** Die Druckfarbe im Tonwert `tone` (1 = voll, 0 = Papierweiß) als Anteile von Rot, Grün, Blau zwischen 0 und 1. */
export function tonedInk(ink: string, tone = 1): [number, number, number] {
	const n = parseInt(ink.slice(1), 16);
	const share = Math.min(1, Math.max(0, tone));
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => 1 - share * (1 - c / 255)) as [number, number, number];
}

function hex(ink: string, tone?: number): string {
	if (tone === undefined || tone >= 1) return ink;
	return '#' + tonedInk(ink, tone).map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
}

/** Die Seite als SVG, 1 Einheit = 1 mm; für die Vorschau im Browser. */
export function pageSvg(page: PrintPage, ink: string): string {
	const shapes = page.items.map((item) =>
		item.kind === 'fill'
			? `<path fill="${hex(ink, item.tone)}" d="${svgPathData(item.commands)}"/>`
			: `<path fill="none" stroke="${hex(ink, item.tone)}" stroke-width="${item.widthMm}" d="${svgPathData(item.commands)}"/>`
	);
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}">${shapes.join('')}</svg>`;
}
