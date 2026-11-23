/** Feste Testgrundlage der Gravur, unabhängig von Kura: Sora in Versalien, dunkel graviert, automatische Größe. */
import type { WoodEngraving, WoodSurroundings } from './types';

export const TEST_ENGRAVING: WoodEngraving = {
	text: 'Teller',
	subText: '',
	uppercase: true,
	font: 'sora',
	weight: 400,
	capHeight: 8,
	tracking: 8,
	subCapRatio: 0.55,
	lineSpacing: 0.6,
	align: 'center',
	grain: 'horizontal',
	process: 'dark',
	depth: 'medium',
	burn: 'medium',
	fillColor: 'black',
	finish: 'oiled',
	shape: 'rectangle',
	cornerRadius: 2,
	frame: false,
	edge: 'burnt',
	sizeMode: 'auto',
	width: 64,
	height: 24
};

/** Feste Umgebung der Vorschau für Tests der Oberfläche */
export const TEST_SURROUNDINGS: WoodSurroundings = {
	front: 'columba',
	view: 'oblique',
	lightAngle: 125,
	grainSeed: 1
};
