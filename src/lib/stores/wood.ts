/**
 * Wood Store - Einstellungen des Holzlabels (/holz), ein Label auf einmal.
 */
import { writable } from 'svelte/store';
import type { WoodSettings } from '$utils/wood/types';

export const DEFAULT_WOOD_SETTINGS: WoodSettings = {
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
	cornerRadius: 3,
	frame: false,
	sizeMode: 'auto',
	width: 80,
	height: 30,
	front: 'white',
	view: 'oblique',
	lightAngle: 125
};

export const woodSettings = writable<WoodSettings>({ ...DEFAULT_WOOD_SETTINGS });

export function updateWood(changes: Partial<WoodSettings>): void {
	woodSettings.update((current) => ({ ...current, ...changes }));
}

export function resetWood(): void {
	woodSettings.set({ ...DEFAULT_WOOD_SETTINGS });
}
