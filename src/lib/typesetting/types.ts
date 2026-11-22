/** Typen des Schriftsatzes, gemeinsam für alle Medien. Alle Längen in mm, y nach unten. */

export type FontId =
	| 'sora'
	| 'noto-sans'
	| 'zen-kaku-gothic-new'
	| 'zen-maru-gothic'
	| 'shippori-mincho'
	| 'josefin-sans'
	| 'jost'
	| 'outfit'
	| 'manrope'
	| 'dm-sans';
export type FontWeight = 400 | 500 | 600 | 700;
export type TextAlign = 'left' | 'center' | 'right';
export type Shape = 'rectangle' | 'pill' | 'oval';

export interface Point {
	x: number;
	y: number;
}

/** Pfadbefehle in mm, y nach unten (SVG-Koordinaten des Labels). */
export type PathCommand =
	| { type: 'M' | 'L'; x: number; y: number }
	| { type: 'Q'; x1: number; y1: number; x: number; y: number }
	| { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
	| { type: 'Z' };

export interface Box {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}
