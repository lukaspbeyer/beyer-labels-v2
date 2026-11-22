/** Feste Testgrundlage der Gravur, unabhängig von Kura: Sora in Versalien, dunkel graviert, automatische Größe. */
import type { WoodSettings } from './types';

export const TEST_SETTINGS: WoodSettings = {
	text: 'Teller',
	subText: '',
	uppercase: true,
	font: 'sora',
	weight: 400,
	capHeight: 8,
	tracking: 8,
	lineSpacing: 0.6,
	align: 'center',
	grain: 'horizontal',
	grainSeed: 1,
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
	height: 24,
	front: 'columba',
	view: 'oblique',
	lightAngle: 125
};
