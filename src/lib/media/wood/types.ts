/** Typen des Mediums Lärche-Gravur. Alle Längen in mm. */
import type { EdgeFinish, FillColor, Finish, GrainDirection, Level, Process } from '$lib/kura/kura';
import type { Box, FontId, FontWeight, PathCommand, Point, Shape, TextAlign } from '$lib/typesetting/types';

export type { Box, FontId, FontWeight, PathCommand, Point, Shape, TextAlign };

export type { EdgeFinish, FillColor, Finish, GrainDirection, Level, Process };
export type SizeMode = 'auto' | 'manual';
export type FrontColor = 'agave' | 'anthracite' | 'columba';
export type ViewAngle = 'front' | 'oblique';

/**
 * Was graviert wird: Format, Text und die Ausprägung von Kura in Lärche.
 * Satz, Fertigungsprüfung und Laserdatei lesen nur dies; wie das Label zu sehen ist, steht in `WoodSurroundings`.
 */
export interface WoodEngraving {
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
}

/**
 * Wie das Label in der Vorschau zu sehen ist: die Umgebung, nicht die Gestaltung (GLOSSARY „Front“).
 * Nur die Vorschau liest sie (Oberfläche, Szene, Draufsicht, Beispielansicht), nie Satz, Prüfung oder Laserdatei.
 */
export interface WoodSurroundings {
	/** Möbelfront hinter dem Label */
	front: FrontColor;
	view: ViewAngle;
	/** Lichtrichtung in Grad, 0 = von rechts, 90 = von oben */
	lightAngle: number;
	/** Startwert für die Wahl des Holzausschnitts */
	grainSeed: number;
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
