/** Typen des Holzlabel-Konfigurators (/holz). Alle Längen in mm. */

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
export type GrainDirection = 'horizontal' | 'vertical';
export type Process = 'dark' | 'inverse' | 'fill';
export type Level = 'low' | 'medium' | 'high';
export type FillColor = 'black' | 'white' | 'anthracite';
export type Finish = 'raw' | 'oiled' | 'lacquer' | 'limed';
export type Shape = 'rectangle' | 'pill' | 'oval';
export type SizeMode = 'auto' | 'manual';
export type FrontColor = 'agave' | 'anthracite' | 'columba';
export type ViewAngle = 'front' | 'oblique';

export interface WoodSettings {
	text: string;
	subText: string;
	uppercase: boolean;
	font: FontId;
	weight: FontWeight;
	/** Versalhöhe der Hauptzeile */
	capHeight: number;
	/** Laufweite in Prozent der Schriftgröße */
	tracking: number;
	/** Abstand zwischen den Zeilen in Vielfachen der Versalhöhe */
	lineSpacing: number;
	align: TextAlign;
	grain: GrainDirection;
	/** Startwert für die Wahl des Holzausschnitts */
	grainSeed: number;
	process: Process;
	depth: Level;
	burn: Level;
	fillColor: FillColor;
	finish: Finish;
	shape: Shape;
	cornerRadius: number;
	frame: boolean;
	sizeMode: SizeMode;
	width: number;
	height: number;
	front: FrontColor;
	view: ViewAngle;
	/** Lichtrichtung in Grad, 0 = von rechts, 90 = von oben */
	lightAngle: number;
}

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

export interface TextLine {
	commands: PathCommand[];
	capHeight: number;
	/** Kleinste Strichstärke dieser Zeile */
	minStroke: number;
}

export interface LabelLayout {
	width: number;
	height: number;
	/** Außenkontur (Schnitt) */
	outline: PathCommand[];
	/** Rahmenlinie (Mittellinie), leer ohne Rahmen */
	frame: PathCommand[];
	/** Begrenzung der Gravurfläche bei inverser Gravur */
	inverseField: PathCommand[];
	lines: TextLine[];
	/** Automatische Größe wurde auf die Grenzwerte beschnitten */
	clamped: boolean;
}

export type WarningKind = 'cap-height' | 'stroke' | 'margin' | 'overflow' | 'size-limit';

export interface FabricationWarning {
	kind: WarningKind;
	message: string;
}
