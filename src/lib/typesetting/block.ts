/** Satz mehrerer Zeilen als Block, der in einem Rechteck steht. */
import type { LoadedFont } from './fonts';
import { translatePath } from './geometry';
import { setLine } from './line';
import type { PathCommand, TextAlign } from './types';

export interface BlockLineSpec {
	text: string;
	capHeight: number;
	trackingPercent: number;
}

export interface PlacedLine {
	commands: PathCommand[];
	capHeight: number;
	/** Breite der Zeichenkonturen, 0 bei leerer Zeile */
	width: number;
}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Setzt die Zeilen untereinander und stellt den Block in das Rechteck: senkrecht mittig
 * (gemessen von der Oberkante der Versalien der ersten bis zur Grundlinie der letzten Zeile),
 * waagerecht nach `align`. `gap` ist der Abstand von Grundlinie zu Versaloberkante der nächsten Zeile.
 */
export function setBlock(font: LoadedFont, specs: readonly BlockLineSpec[], gap: number, rect: Rect, align: TextAlign): PlacedLine[] {
	const set = specs.map((s) => setLine(font, s.text, s.capHeight, s.trackingPercent));
	const baselines = set.reduce<number[]>((acc, line, i) => (i === 0 ? [line.capHeight] : [...acc, acc[i - 1] + gap + line.capHeight]), []);
	const blockHeight = baselines[baselines.length - 1] ?? 0;
	const top = rect.y + (rect.height - blockHeight) / 2;
	return set.map((line, i) => {
		const width = Number.isFinite(line.ink.maxX) ? line.ink.maxX - line.ink.minX : 0;
		if (width === 0) return { commands: [], capHeight: line.capHeight, width };
		const left = align === 'left' ? rect.x : align === 'right' ? rect.x + rect.width - width : rect.x + (rect.width - width) / 2;
		return { commands: translatePath(line.commands, left - line.ink.minX, top + baselines[i]), capHeight: line.capHeight, width };
	});
}
