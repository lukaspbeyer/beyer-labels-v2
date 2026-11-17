/**
 * Gestaltungsvorlagen im Japandi-Stil für die Fronten im Haus (Agave, Anthrazit, Columba Grey).
 * Eine Vorlage setzt nur Gestaltung und Front; Text, Größe, Maserung, Ansicht und Licht bleiben.
 */
import type { WoodSettings } from './types';

export type PresetSettings = Pick<
	WoodSettings,
	| 'uppercase'
	| 'font'
	| 'weight'
	| 'capHeight'
	| 'tracking'
	| 'process'
	| 'depth'
	| 'burn'
	| 'fillColor'
	| 'finish'
	| 'shape'
	| 'cornerRadius'
	| 'frame'
	| 'front'
>;

export interface WoodPreset {
	id: string;
	name: string;
	description: string;
	settings: PresetSettings;
}

export const PRESETS: readonly WoodPreset[] = [
	{
		id: 'tatami',
		name: 'Tatami',
		description: 'Sora, dunkel graviert, geölt. Der Beyer-Klassiker.',
		settings: {
			uppercase: true,
			font: 'sora',
			weight: 400,
			capHeight: 8,
			tracking: 8,
			process: 'dark',
			depth: 'medium',
			burn: 'medium',
			fillColor: 'black',
			finish: 'oiled',
			shape: 'rectangle',
			cornerRadius: 2,
			frame: false,
			front: 'columba'
		}
	},
	{
		id: 'sumi',
		name: 'Sumi',
		description: 'Tuschschwarz gefüllt, Lack matt, klare Ecken.',
		settings: {
			uppercase: true,
			font: 'zen-kaku-gothic-new',
			weight: 500,
			capHeight: 8,
			tracking: 14,
			process: 'fill',
			depth: 'low',
			burn: 'medium',
			fillColor: 'black',
			finish: 'lacquer',
			shape: 'rectangle',
			cornerRadius: 0,
			frame: false,
			front: 'agave'
		}
	},
	{
		id: 'washi',
		name: 'Washi',
		description: 'Weiß gekalkt, weiche Schrift, Pillenform.',
		settings: {
			uppercase: false,
			font: 'zen-maru-gothic',
			weight: 500,
			capHeight: 8,
			tracking: 4,
			process: 'dark',
			depth: 'low',
			burn: 'medium',
			fillColor: 'black',
			finish: 'limed',
			shape: 'pill',
			cornerRadius: 0,
			frame: false,
			front: 'anthracite'
		}
	},
	{
		id: 'hinoki',
		name: 'Hinoki',
		description: 'Inverse Gravur, die Schrift bleibt holzhell.',
		settings: {
			uppercase: true,
			font: 'josefin-sans',
			weight: 600,
			capHeight: 9,
			tracking: 12,
			process: 'inverse',
			depth: 'medium',
			burn: 'medium',
			fillColor: 'black',
			finish: 'raw',
			shape: 'rectangle',
			cornerRadius: 2,
			frame: false,
			front: 'columba'
		}
	},
	{
		id: 'mincho',
		name: 'Mincho',
		description: 'Serifenschrift, tief und dunkel gebrannt, mit Rahmen.',
		settings: {
			uppercase: true,
			font: 'shippori-mincho',
			weight: 600,
			capHeight: 9,
			tracking: 10,
			process: 'dark',
			depth: 'high',
			burn: 'high',
			fillColor: 'black',
			finish: 'oiled',
			shape: 'rectangle',
			cornerRadius: 1,
			frame: true,
			front: 'anthracite'
		}
	},
	{
		id: 'ishi',
		name: 'Ishi',
		description: 'Anthrazit gefüllt, geölt, Pillenform.',
		settings: {
			uppercase: true,
			font: 'jost',
			weight: 500,
			capHeight: 8,
			tracking: 16,
			process: 'fill',
			depth: 'low',
			burn: 'medium',
			fillColor: 'anthracite',
			finish: 'oiled',
			shape: 'pill',
			cornerRadius: 0,
			frame: false,
			front: 'agave'
		}
	}
];

/** Stimmen die Einstellungen in allen Feldern der Vorlage überein? */
export function matchesPreset(settings: WoodSettings, preset: WoodPreset): boolean {
	const s = preset.settings;
	return (
		settings.uppercase === s.uppercase &&
		settings.font === s.font &&
		settings.weight === s.weight &&
		settings.capHeight === s.capHeight &&
		settings.tracking === s.tracking &&
		settings.process === s.process &&
		settings.depth === s.depth &&
		(s.process === 'fill' ? settings.fillColor === s.fillColor : settings.burn === s.burn) &&
		settings.finish === s.finish &&
		settings.shape === s.shape &&
		(s.shape !== 'rectangle' || settings.cornerRadius === s.cornerRadius) &&
		settings.frame === s.frame &&
		settings.front === s.front
	);
}
