/** Satz einer einzelnen Zeile aus Glyphenkonturen. */
import type { Glyph } from 'opentype.js';
import type { LoadedFont } from './fonts';
import { flattenPath, polylinesBox } from './geometry';
import type { Box, PathCommand } from './types';

/** Eine gesetzte Zeile mit Ursprung am Zeilenanfang auf der Grundlinie. */
export interface SetLine {
	commands: PathCommand[];
	ink: Box;
	capHeight: number;
	minStroke: number;
}

function glyphCommands(glyph: Glyph, x: number, scale: number): PathCommand[] {
	return glyph.path.commands.map((c): PathCommand => {
		if (c.type === 'Z') return c;
		if (c.type === 'Q') return { type: 'Q', x1: x + c.x1 * scale, y1: -c.y1 * scale, x: x + c.x * scale, y: -c.y * scale };
		if (c.type === 'C')
			return {
				type: 'C',
				x1: x + c.x1 * scale,
				y1: -c.y1 * scale,
				x2: x + c.x2 * scale,
				y2: -c.y2 * scale,
				x: x + c.x * scale,
				y: -c.y * scale
			};
		return { type: c.type, x: x + c.x * scale, y: -c.y * scale };
	});
}

/** Setzt eine Zeile Zeichen für Zeichen mit Unterschneidung und Laufweite (ohne Ligaturen). */
export function setLine(font: LoadedFont, text: string, capHeight: number, trackingPercent: number): SetLine {
	const fontSize = (capHeight * font.font.unitsPerEm) / font.capUnits;
	const scale = fontSize / font.font.unitsPerEm;
	const tracking = (trackingPercent / 100) * fontSize;
	const glyphs = Array.from(text).map((ch) => font.font.charToGlyph(ch));
	const commands: PathCommand[] = [];
	let x = 0;
	glyphs.forEach((glyph, i) => {
		if (i > 0) x += font.font.getKerningValue(glyphs[i - 1], glyph) * scale;
		commands.push(...glyphCommands(glyph, x, scale));
		x += (glyph.advanceWidth ?? 0) * scale + tracking;
	});
	const hasLowercase = /\p{Ll}/u.test(text);
	const ratio = hasLowercase ? font.lowerStrokeRatio : font.upperStrokeRatio;
	return { commands, ink: polylinesBox(flattenPath(commands)), capHeight, minStroke: ratio * capHeight };
}
