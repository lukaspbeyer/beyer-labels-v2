/**
 * Umgebung der Vorschau eines Labels in Lärche: Möbelfront, Blickwinkel, Licht und Holzausschnitt.
 * Sie gehört nicht zur Gestaltung (GLOSSARY „Front“) und nicht zur Gravur; nur die Vorschau liest sie.
 * Die Farbe einer Front kommt allein aus `frontColor` (Werte in calibration.json).
 */
import { calibration } from './calibration';
import type { FrontColor, WoodSurroundings } from './types';

/** Die Fronten mit ihren Namen, in der Reihenfolge der Auswahl */
export const FRONT_NAMES: Readonly<Record<FrontColor, string>> = { agave: 'Agave', anthracite: 'Anthrazit', columba: 'Columba Grey' };

export const FRONT_COLORS = Object.keys(FRONT_NAMES) as FrontColor[];

/** Die Umgebung, mit der eine Vorschau beginnt */
export const DEFAULT_WOOD_SURROUNDINGS: WoodSurroundings = { front: 'agave', view: 'oblique', lightAngle: 125, grainSeed: 1 };

/** CSS-Farbe einer Front */
export function frontColor(front: FrontColor): string {
	return calibration.front.color[front];
}
