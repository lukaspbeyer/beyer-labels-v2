// Typen für den genutzten Teil von opentype.js 2.x (das Paket liefert keine eigenen Typen).
declare module 'opentype.js' {
	export type PathCommand =
		| { type: 'M' | 'L'; x: number; y: number }
		| { type: 'Q'; x1: number; y1: number; x: number; y: number }
		| { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
		| { type: 'Z' };

	export interface Path {
		commands: PathCommand[];
	}

	export interface Glyph {
		index: number;
		advanceWidth?: number;
		path: Path;
	}

	export interface Font {
		unitsPerEm: number;
		ascender: number;
		descender: number;
		tables: { os2?: { sCapHeight?: number; sxHeight?: number } };
		charToGlyph(char: string): Glyph;
		getKerningValue(left: Glyph, right: Glyph): number;
	}

	export function parse(buffer: ArrayBuffer): Font;
}
