import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, err } from '$utils/result';
import { calibration } from './calibration';
import { layoutLabel } from './layout';
import type { SurfaceMaps, WoodSource } from './surface';
import { createSurfaceView, recordFrame, surfaceKey, type SurfaceFrame } from './surfaceView';
import { TEST_ENGRAVING, TEST_SURROUNDINGS } from './testEngraving';
import type { WoodSurroundings } from './types';
import { loadTestFont } from '$lib/typesetting/testFonts';

const font = loadTestFont(TEST_ENGRAVING.font, TEST_ENGRAVING.weight);
const layout = layoutLabel(TEST_ENGRAVING, font);
const wood = {} as WoodSource;
const maps = (pxPerMm: number) => ({ width: 2, height: 2, pxPerMm }) as SurfaceMaps;

function setup(failQuick = false) {
	const shown: SurfaceFrame[] = [];
	const failed = vi.fn();
	const render = vi.fn((_l, _e, _s, _w, maxPxPerMm = Infinity) => (failQuick ? err({ kind: 'canvas-unavailable' as const }) : ok(maps(maxPxPerMm))));
	const view = createSurfaceView({ wood, render, now: () => 0, show: (frame) => shown.push(frame), fail: failed });
	return { view, shown, render, failed };
}

describe('Oberflächenansicht', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('zeigt sofort ein gröberes Bild und nach der Wartezeit die volle Auflösung', () => {
		const { view, shown } = setup();
		view.update(layout, TEST_ENGRAVING, TEST_SURROUNDINGS);
		expect(shown.map((f) => [f.quality, f.count, f.maps.pxPerMm])).toEqual([['quick', 1, calibration.render.quickPxPerMm]]);
		vi.advanceTimersByTime(calibration.render.refineDelayMs - 1);
		expect(shown).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(shown.map((f) => [f.quality, f.count])).toEqual([['quick', 1], ['full', 2]]);
	});

	it('rechnet bei schnellen Änderungen nur für den letzten Stand voll', () => {
		const { view, shown, render } = setup();
		view.update(layout, TEST_ENGRAVING, TEST_SURROUNDINGS);
		vi.advanceTimersByTime(calibration.render.refineDelayMs / 2);
		view.update(layout, TEST_ENGRAVING, { ...TEST_SURROUNDINGS, lightAngle: 40 });
		vi.advanceTimersByTime(calibration.render.refineDelayMs);
		expect(shown.map((f) => f.quality)).toEqual(['quick', 'quick', 'full']);
		expect(render.mock.calls.filter((call) => call[4] === undefined).map((call) => call[2].lightAngle)).toEqual([40]);
	});

	it('rechnet nicht neu, wenn sich nur Front oder Blickwinkel ändern, zeigt das Bild aber mit der neuen Umgebung', () => {
		const shown: [SurfaceFrame['quality'], WoodSurroundings][] = [];
		const render = vi.fn((_l, _e, _s, _w, maxPxPerMm = Infinity) => ok(maps(maxPxPerMm)));
		const view = createSurfaceView({ wood, render, now: () => 0, show: (frame, _l, _e, s) => shown.push([frame.quality, s]) });
		view.update(layout, TEST_ENGRAVING, TEST_SURROUNDINGS);
		vi.advanceTimersByTime(calibration.render.refineDelayMs);
		const other: WoodSurroundings = { ...TEST_SURROUNDINGS, front: 'anthracite', view: 'front' };
		view.update(layout, TEST_ENGRAVING, other);
		expect(render).toHaveBeenCalledTimes(2);
		expect(shown).toEqual([
			['quick', TEST_SURROUNDINGS],
			['full', TEST_SURROUNDINGS],
			['full', other]
		]);
	});

	it('unterscheidet Gravur, Licht und Holzausschnitt im Schlüssel, nicht aber Front und Blickwinkel', () => {
		const key = surfaceKey(layout, TEST_ENGRAVING, TEST_SURROUNDINGS);
		const other = { ...TEST_ENGRAVING, text: 'tassen' };
		expect(key).not.toBe(surfaceKey(layoutLabel(other, font), other, TEST_SURROUNDINGS));
		expect(key).not.toBe(surfaceKey(layout, { ...TEST_ENGRAVING, finish: 'raw' }, TEST_SURROUNDINGS));
		expect(key).not.toBe(surfaceKey(layout, TEST_ENGRAVING, { ...TEST_SURROUNDINGS, lightAngle: 1 }));
		expect(key).not.toBe(surfaceKey(layout, TEST_ENGRAVING, { ...TEST_SURROUNDINGS, grainSeed: 2 }));
		const elsewhere: WoodSurroundings = { ...TEST_SURROUNDINGS, front: 'anthracite', view: 'front' };
		expect(key).toBe(surfaceKey(layout, TEST_ENGRAVING, elsewhere));
	});

	it('meldet ein gescheitertes Schnellbild und plant keine Verfeinerung', () => {
		const { view, shown, failed, render } = setup(true);
		view.update(layout, TEST_ENGRAVING, TEST_SURROUNDINGS);
		vi.advanceTimersByTime(calibration.render.refineDelayMs);
		expect(failed).toHaveBeenCalledWith({ kind: 'canvas-unavailable' });
		expect(shown).toEqual([]);
		expect(render).toHaveBeenCalledTimes(1);
	});

	it('zeigt nach dem Abbau nichts mehr', () => {
		const { view, shown } = setup();
		view.update(layout, TEST_ENGRAVING, TEST_SURROUNDINGS);
		view.dispose();
		vi.advanceTimersByTime(calibration.render.refineDelayMs);
		expect(shown).toHaveLength(1);
	});

	it('schreibt die Messwerte ans Element', () => {
		const element = document.createElement('div');
		recordFrame(element, { maps: maps(8), quality: 'full', ms: 12.345, count: 3 });
		expect({ ...element.dataset }).toEqual({ renderCount: '3', renderQuality: 'full', renderMs: '12.3' });
	});
});
