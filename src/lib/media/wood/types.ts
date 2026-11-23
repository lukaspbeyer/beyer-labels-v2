/** Typen des Mediums Lärche-Gravur. Alle Längen in mm. */
import type { EdgeFinish, FillColor, Finish, GrainDirection, Level, Process } from '$lib/kura/kura';
import type { Box, FontId, FontWeight, PathCommand, Point, Shape, TextAlign } from '$lib/typesetting/types';

export type { Box, FontId, FontWeight, PathCommand, Point, Shape, TextAlign };

export type { EdgeFinish, FillColor, Finish, GrainDirection, Level, Process };
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
	/** Versalhöhe der Unterzeile relativ zur Hauptzeile */
	subCapRatio: number;
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
	edge: EdgeFinish;
	sizeMode: SizeMode;
	width: number;
	height: number;
	front: FrontColor;
	view: ViewAngle;
	/** Lichtrichtung in Grad, 0 = von rechts, 90 = von oben */
	lightAngle: number;
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
