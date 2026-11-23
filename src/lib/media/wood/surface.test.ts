import { beforeAll, describe, expect, it } from 'vitest';
import { calibration } from './calibration';
import { blurField, chooseGrainWindow, composeSurface, seededRandom, shadeFlat, shadowField, surfaceResolution, type SurfaceInput } from './surface';
import { TEST_SETTINGS } from './testSettings';

// jsdom kennt ImageData nicht; die Rechnung braucht davon nur Maße und Daten
beforeAll(() => {
	globalThis.ImageData ??= class {
		data: Uint8ClampedArray;
		constructor(
			public width: number,
			public height: number
		) {
			this.data = new Uint8ClampedArray(width * height * 4);
		}
	} as unknown as typeof ImageData;
});

/** Ein Label von w × h Pixeln aus hellem Holz mit einem gravierten Quadrat in der Mitte. */
function input(w = 24, h = 12, pxPerMm = 4): SurfaceInput {
	const engraved = new Float32Array(w * h);
	for (let y = 4; y < 8; y++) for (let x = 10; x < 14; x++) engraved[y * w + x] = 1;
	return { width: w, height: h, pxPerMm, engraved, inside: new Float32Array(w * h).fill(1), latewood: new Float32Array(w * h), wood: new Float32Array(w * h * 3).fill(0.8) };
}

const luminance = (data: Uint8ClampedArray, pixel: number) => data[pixel * 4] + data[pixel * 4 + 1] + data[pixel * 4 + 2];

describe('Oberfläche: Rechnung', () => {
	it('wählt den Holzausschnitt je Startwert gleich und innerhalb einer Lamelle', () => {
		const t = calibration.woodTexture;
		const a = chooseGrainWindow({ ...TEST_SETTINGS, grainSeed: 3 }, 64, 24);
		expect(chooseGrainWindow({ ...TEST_SETTINGS, grainSeed: 3 }, 64, 24)).toEqual(a);
		expect(chooseGrainWindow({ ...TEST_SETTINGS, grainSeed: 4 }, 64, 24)).not.toEqual(a);
		const across = 24 / t.mmPerPx;
		expect(a.x).toBeGreaterThanOrEqual(0);
		expect(a.x + 64 / t.mmPerPx).toBeLessThanOrEqual(t.widthPx);
		expect(t.lamellae.some((l) => a.y >= l[0] && a.y + across <= l[1])).toBe(true);
	});

	it('liefert für denselben Startwert dieselbe Zufallsfolge zwischen 0 und 1', () => {
		const a = seededRandom(7);
		const b = seededRandom(7);
		const values = [a(), a(), a()];
		expect([b(), b(), b()]).toEqual(values);
		expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
	});

	it('begrenzt die Auflösung durch das Pixelbudget', () => {
		const { maxPixels, maxPxPerMm } = calibration.render;
		expect(surfaceResolution(1, 1)).toBe(maxPxPerMm);
		const pxPerMm = surfaceResolution(1000, 1000);
		expect(pxPerMm * pxPerMm * 1000 * 1000).toBeCloseTo(maxPixels, 3);
	});

	it('weicht eine Kante auf, ohne eine ebene Fläche zu verändern', () => {
		const flat = new Float32Array(64).fill(0.5);
		expect(Array.from(blurField(flat, 8, 8, 2))).toEqual(Array.from(flat));
		const step = new Float32Array(16 * 4).map((_, i) => (i % 16 < 8 ? 0 : 1));
		const blurred = blurField(step, 16, 4, 2);
		expect(blurred[0]).toBeCloseTo(0, 5);
		expect(blurred[15]).toBeCloseTo(1, 5);
		expect(blurred[7]).toBeGreaterThan(0);
		expect(blurred[8]).toBeLessThan(1);
		expect(blurred[7]).toBeLessThan(blurred[8]);
	});

	it('legt Schatten nur in die Gravur, an die Wand zum Licht hin', () => {
		const w = 20;
		const height = new Float32Array(w).map((_, x) => (x >= 5 && x < 15 ? -0.5 : 0));
		// Licht von rechts (0°): der Boden nahe der rechten Wand liegt im Schatten, der an der linken nicht
		const shadow = shadowField(height, w, 1, 10, 0, 0.5);
		expect(shadow[14]).toBeGreaterThan(0.5);
		expect(shadow[5]).toBe(0);
		expect(shadow[2]).toBe(0);
	});

	it('färbt die Gravur dunkel und lässt das Holz daneben hell', () => {
		const source = input();
		const maps = composeSurface(source, { ...TEST_SETTINGS, process: 'fill', fillColor: 'black' });
		const centre = 6 * source.width + 12;
		const wood = 1 * source.width + 2;
		expect(maps.albedo.data).toHaveLength(source.width * source.height * 4);
		expect(luminance(maps.albedo.data, centre)).toBeLessThan(luminance(maps.albedo.data, wood) / 2);
		// die Normale zeigt auf ebener Fläche aus dem Bild heraus
		expect(maps.normal.data[wood * 4 + 2]).toBeGreaterThan(240);
	});

	it('beleuchtet die flache Ansicht aus den Normalen, ohne Farben zu erfinden', () => {
		const source = input();
		const maps = { width: source.width, height: source.height, pxPerMm: source.pxPerMm, ...composeSurface(source, TEST_SETTINGS) };
		const lit = shadeFlat(maps, 125);
		const wood = 1 * source.width + 2;
		expect(lit.data[wood * 4 + 3]).toBe(255);
		expect(luminance(lit.data, wood)).toBeGreaterThan(0);
		expect(luminance(lit.data, 6 * source.width + 12)).toBeLessThan(luminance(lit.data, wood));
	});
});
