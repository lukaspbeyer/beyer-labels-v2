/**
 * Medium Papier-Druck: eine Seite als Liste von Vektorformen in mm (y nach unten).
 * Text ist immer schon in Konturen umgewandelt; gedruckt wird in einer Farbe, der Druckfarbe aus Kura.
 * Vorschau, PDF und Beispielansicht baut `medium.ts` aus diesen Seiten.
 */
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
