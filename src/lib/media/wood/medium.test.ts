import { describe, expect, it } from 'vitest';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { calibration } from './calibration';
import { layoutLabel } from './layout';
import { WOOD, woodExample, woodFile, woodSketch } from './medium';
import { buildSheetSvg } from './svgExport';
import { DEFAULT_WOOD_SURROUNDINGS } from './surroundings';
import { TEST_ENGRAVING } from './testEngraving';
import type { WoodEngraving } from './types';

const sora = loadTestFont('sora', 400);

function label(changes: Partial<WoodEngraving> = {}) {
	const engraving = { ...TEST_ENGRAVING, sizeMode: 'manual' as const, ...changes };
	return { layout: layoutLabel(engraving, sora), engraving };
}

describe('Lärche-Gravur', () => {
	it('liefert die Laserdatei mit dem Medientyp des Mediums', async () => {
		const labels = [label(), label({ text: 'Tassen' })];
		const file = await woodFile(labels, 'probe.svg', 'Probe');
		expect(file).toEqual({ fileName: 'probe.svg', mime: WOOD.mime, body: buildSheetSvg(labels, 'Probe') });
		expect([WOOD.output, WOOD.mime]).toEqual(['SVG', 'image/svg+xml']);
	});

	it('zeigt ein Beispiel vor der Front seiner Umgebung, mit der Draufsicht als Skizze aus der Gravur', () => {
		const surroundings = { ...DEFAULT_WOOD_SURROUNDINGS, front: 'anthracite' as const };
		const example = woodExample(label(), surroundings);
		expect(example).toMatchObject({ medium: WOOD.id, width: 64, height: 24, backdrop: calibration.front.color.anthracite, surroundings });
		expect(example.sketch).toContain('viewBox="0 0 64 24"');
		expect(woodExample(label(), DEFAULT_WOOD_SURROUNDINGS).sketch).toBe(example.sketch);
	});

	it('zeichnet die Skizze in der Farbe des Verfahrens', () => {
		const { layout, engraving } = label({ process: 'fill', fillColor: 'anthracite' });
		expect(woodSketch(layout, engraving)).toContain(`fill="${calibration.fill.color.anthracite}"`);
	});
});
