/**
 * Wood Store - Eingabe des Holzlabels (/holz), ein Label auf einmal.
 * Die Einstellungen der Gravur entstehen daraus und aus Kura.
 */
import { derived, writable } from 'svelte/store';
import { KURA } from '$lib/kura/kura';
import { DEFAULT_WOOD_LABEL_INPUT, woodLabelSettings, type WoodLabelInput } from '$lib/products/woodLabel';

export const woodLabelInput = writable<WoodLabelInput>({ ...DEFAULT_WOOD_LABEL_INPUT });

export const woodSettings = derived(woodLabelInput, ($input) => woodLabelSettings(KURA, $input));

export function updateWoodLabel(changes: Partial<WoodLabelInput>): void {
	woodLabelInput.update((current) => ({ ...current, ...changes }));
}
