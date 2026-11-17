/**
 * Wood Store - Einstellungen des Holzlabels (/holz), ein Label auf einmal.
 */
import { writable } from 'svelte/store';
import { PRESETS, presetChanges, type WoodPreset } from '$utils/wood/presets';
import type { WoodSettings } from '$utils/wood/types';

const TATAMI = PRESETS[0].settings;

/** Startzustand: Vorlage „Tatami“ mit dem Text „Teller“. */
export const DEFAULT_WOOD_SETTINGS: WoodSettings = {
	...TATAMI,
	text: 'Teller',
	subText: '',
	lineSpacing: 0.6,
	align: 'center',
	grain: 'horizontal',
	grainSeed: 1,
	sizeMode: 'auto',
	width: 80,
	height: 30,
	view: 'oblique',
	lightAngle: 125
};

export const woodSettings = writable<WoodSettings>({ ...DEFAULT_WOOD_SETTINGS });

export function updateWood(changes: Partial<WoodSettings>): void {
	woodSettings.update((current) => ({ ...current, ...changes }));
}

/** Übernimmt Gestaltung und Front einer Vorlage, bei festem Format auch die Größe; der Text bleibt. */
export function applyPreset(preset: WoodPreset): void {
	updateWood(presetChanges(preset));
}

export function resetWood(): void {
	woodSettings.set({ ...DEFAULT_WOOD_SETTINGS });
}
