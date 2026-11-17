import { describe, expect, it } from 'vitest';
import { DEFAULT_WOOD_SETTINGS } from '$stores/wood';
import { checkFabrication } from './checks';
import { fontInfo, nearestWeight } from './fonts';
import { layoutLabel } from './layout';
import { matchesPreset, PRESETS } from './presets';
import { loadTestFont } from './testFonts';
import type { WoodSettings } from './types';

describe('Vorlagen', () => {
	it.each(PRESETS.map((p) => [p.name, p] as const))('%s nutzt einen vorhandenen Schnitt', (_name, preset) => {
		expect(fontInfo(preset.settings.font).weights).toContain(preset.settings.weight);
	});

	it.each(PRESETS.flatMap((p) => ['Teller', 'Gewürze', 'Vorräte'].map((text) => [p.name, text, p] as const)))(
		'%s mit „%s“ ist ohne Fertigungswarnung',
		(_name, text, preset) => {
			const settings: WoodSettings = { ...DEFAULT_WOOD_SETTINGS, ...preset.settings, text };
			const font = loadTestFont(settings.font, settings.weight);
			expect(checkFabrication(layoutLabel(settings, font), settings)).toEqual([]);
		}
	);

	it('erkennt die angewandte Vorlage und nur diese', () => {
		for (const preset of PRESETS) {
			const settings: WoodSettings = { ...DEFAULT_WOOD_SETTINGS, ...preset.settings };
			expect(PRESETS.filter((p) => matchesPreset(settings, p)).map((p) => p.id)).toEqual([preset.id]);
		}
	});

	it('Startzustand entspricht der Vorlage Tatami', () => {
		expect(matchesPreset(DEFAULT_WOOD_SETTINGS, PRESETS[0])).toBe(true);
	});
});

describe('Schnittwahl', () => {
	it('wählt beim Schriftwechsel den nächsten vorhandenen Schnitt', () => {
		expect(nearestWeight('zen-maru-gothic', 600)).toBe(500);
		expect(nearestWeight('zen-maru-gothic', 700)).toBe(700);
		expect(nearestWeight('sora', 700)).toBe(600);
		expect(nearestWeight('sora', 500)).toBe(500);
	});
});
