import { describe, expect, it } from 'vitest';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { calibration } from './calibration';
import { layoutLabel } from './layout';
import { WOOD, woodExample, woodFile, woodSketch } from './medium';
import { buildSheetSvg } from './svgExport';
import { TEST_SETTINGS } from './testSettings';
import type { WoodSettings } from './types';

const sora = loadTestFont('sora', 400);

function label(changes: Partial<WoodSettings> = {}) {
	const settings = { ...TEST_SETTINGS, sizeMode: 'manual' as const, ...changes };
	return { layout: layoutLabel(settings, sora), settings };
}

describe('Lärche-Gravur', () => {
	it('liefert die Laserdatei mit dem Medientyp des Mediums', async () => {
		const labels = [label(), label({ text: 'Tassen' })];
		const file = await woodFile(labels, 'probe.svg');
		expect(file).toEqual({ fileName: 'probe.svg', mime: WOOD.mime, body: buildSheetSvg(labels) });
		expect([WOOD.output, WOOD.mime]).toEqual(['SVG', 'image/svg+xml']);
	});

	it('zeigt ein Beispiel vor der Front aus seinen Einstellungen, mit der Draufsicht als Skizze', () => {
		const example = woodExample(label({ front: 'anthracite' }));
		expect(example).toMatchObject({ medium: WOOD.id, width: 64, height: 24, backdrop: calibration.front.color.anthracite });
		expect(example.sketch).toContain('viewBox="0 0 64 24"');
	});

	it('zeichnet die Skizze in der Farbe des Verfahrens', () => {
		const { layout, settings } = label({ process: 'fill', fillColor: 'anthracite' });
		expect(woodSketch(layout, settings)).toContain(`fill="${calibration.fill.color.anthracite}"`);
	});
});
