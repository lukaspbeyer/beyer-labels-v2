/**
 * Medium Papier-Druck: eine Seite als Liste von Vektorformen in mm (y nach unten).
 * Text ist immer schon in Konturen umgewandelt; gedruckt wird in der Druckfarbe aus Kura,
 * eine Form mit `tone: 'signal'` in ihrer Signalfarbe. Die Farben selbst setzt nur das Medium ein.
 * Vorschau, PDF und Beispielansicht baut `medium.ts` aus diesen Seiten.
 */
import type { PathCommand } from '$lib/typesetting/types';

/** Welche Farbe aus Kura eine Form trägt: die Druckfarbe (Vorgabe) oder die Signalfarbe */
export type PrintTone = 'ink' | 'signal';

export type PrintItem =
	| { kind: 'fill'; commands: PathCommand[]; tone?: PrintTone }
	| { kind: 'stroke'; commands: PathCommand[]; widthMm: number; tone?: PrintTone };

/** Die Farbe einer Form als #rrggbb, aus Kuras Ausprägung für Papier */
export function toneColor(paper: { readonly ink: string; readonly signal: string }, tone: PrintTone = 'ink'): string {
	return tone === 'signal' ? paper.signal : paper.ink;
}

export interface PrintPage {
	width: number;
	height: number;
	items: PrintItem[];
}
