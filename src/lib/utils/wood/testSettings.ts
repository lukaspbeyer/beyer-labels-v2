/** Feste Testgrundlage, unabhängig vom Startzustand: Vorlage Tatami (Sora, automatische Größe) mit „Teller“. */
import { DEFAULT_WOOD_SETTINGS } from '$stores/wood';
import { PRESETS, presetChanges } from './presets';
import type { WoodSettings } from './types';

function tatamiSettings(): WoodSettings {
	const tatami = PRESETS.find((p) => p.id === 'tatami');
	if (!tatami) throw new Error('Vorlage Tatami fehlt');
	return { ...DEFAULT_WOOD_SETTINGS, ...presetChanges(tatami), text: 'Teller' };
}

export const TEST_SETTINGS: WoodSettings = tatamiSettings();
