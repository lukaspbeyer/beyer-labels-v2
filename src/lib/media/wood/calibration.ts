/**
 * Kalibrierung des Holzlabel-Konfigurators.
 * Alle Werte stehen in calibration.json und lassen sich dort ohne Codeänderung anpassen,
 * etwa nach einer Testgravur. Diese Datei prüft nur die Struktur beim Übersetzen.
 */
import values from './calibration.json';
import type { EdgeFinish, FillColor, Finish, FrontColor, Level } from './types';

export interface FinishCalibration {
	/** > 1 dunkelt das Holz ab (Anfeuern) */
	gamma: number;
	saturation: number;
	/** Farbton, mit dem die Holzfarbe multipliziert wird */
	tint: string;
	/** Anteil weißer Lasur, 0..1 */
	lime: number;
	roughness: number;
	clearcoat: number;
	clearcoatRoughness: number;
	/** Faktor auf die Brennfarbe, < 1 dunkelt ab */
	burnDarken: number;
}

export interface Calibration {
	woodTexture: {
		colorUrl: string;
		latewoodUrl: string;
		widthPx: number;
		heightPx: number;
		/** Abbildungsmaßstab der Textur */
		mmPerPx: number;
		/** Lamellen der Platte als [y0, y1] in Pixeln, Faser waagerecht */
		lamellae: readonly (readonly number[])[];
		/** Stärke der feinen Faserstruktur, die das Foto ergänzt */
		fiberDetail: number;
	};
	engraving: {
		depthMm: Record<Level, number>;
		burnColor: Record<Level, string>;
		/** Spätholz wird um diesen Anteil flacher graviert */
		latewoodDepthReduction: number;
		/** Spätholz brennt um diesen Anteil heller */
		latewoodColorLighten: number;
		floorNoiseMm: number;
		/** Weichzeichnung der Gravurkanten durch den Strahldurchmesser */
		beamBlurMm: number;
		/** Waagerechte Breite der Gravurwand je mm Tiefe (Strahlkegel) */
		wallTaper: number;
		/** Abdunkelung des Gravurbodens an den Wänden, wächst mit der Tiefe */
		cavityStrength: number;
		/** Stärke des Eigenschattens der Gravurwände */
		selfShadow: number;
		/** Rauch- und Harzhof um die Gravur */
		haloRadiusMm: number;
		haloStrength: number;
		roughness: number;
		/** Unbearbeiteter Rand bei inverser Gravur */
		inverseRimMm: number;
	};
	fill: { color: Record<FillColor, string>; roughness: number };
	finish: Record<Finish, FinishCalibration>;
	limeColor: string;
	/** Anteil der Lasur, der in der Gravur verbleibt */
	limeInEngraving: number;
	edge: Record<EdgeFinish, { color: string; roughness: number; topBurnWidthMm: number; topBurnStrength: number }>;
	label: { thicknessMm: number; tapeGapMm: number };
	frame: { insetMm: number; lineWidthMm: number };
	/** Möbelfronten im Haus; Farbwerte geschätzt, nach Muster anpassen */
	front: { color: Record<FrontColor, string>; roughness: number };
	light: {
		elevationDeg: number;
		intensity: number;
		color: string;
		ambient: number;
		environment: number;
		exposure: number;
	};
	layout: {
		/** Innenabstand in Vielfachen der Versalhöhe */
		paddingX: number;
		paddingY: number;
		minPadding: number;
		minWidth: number;
		maxWidth: number;
		minHeight: number;
		maxHeight: number;
	};
	/** Grenzwerte der Fertigungswarnungen */
	fabrication: { minCapHeightMm: number; minStrokeMm: number; minMarginMm: number };
	render: {
		maxPixels: number;
		maxPxPerMm: number;
		/** Auflösung des sofortigen Zwischenbilds nach einer Änderung */
		quickPxPerMm: number;
		/** Wartezeit ohne weitere Änderung bis zur vollen Auflösung */
		refineDelayMs: number;
	};
}

export const calibration: Calibration = values;
