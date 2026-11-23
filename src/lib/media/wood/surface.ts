/**
 * Oberflächensynthese des Labels: Farbe, Normalen und Rauheit als Texturen.
 * Rasterung über Canvas (Adapter), die Berechnung selbst arbeitet auf Arrays.
 */
import { err, ok, type Result } from '$utils/result';
import { calibration } from './calibration';
import { tracePath } from '$lib/typesetting/geometry';
import type { LabelLayout, PathCommand, WoodEngraving, WoodSurroundings } from './types';

export interface WoodSource {
	color: CanvasImageSource;
	latewood: CanvasImageSource;
}

export interface SurfaceMaps {
	width: number;
	height: number;
	pxPerMm: number;
	albedo: ImageData;
	normal: ImageData;
	roughness: ImageData;
}

export type SurfaceError = { kind: 'canvas-unavailable' } | { kind: 'image-load'; url: string };

/**
 * Was die Texturen außer der Gravur bestimmt: der Holzausschnitt und die Lichtrichtung (Eigenschatten der Gravur).
 * Front und Blickwinkel gehören nicht dazu.
 */
export type SurfaceSurroundings = Pick<WoodSurroundings, 'grainSeed' | 'lightAngle'>;

/** Pixel des Labels als Gleitkommafelder (0..1). */
export interface SurfaceInput {
	width: number;
	height: number;
	pxPerMm: number;
	/** Gravurfläche */
	engraved: Float32Array;
	/** Fläche innerhalb der Außenkontur */
	inside: Float32Array;
	latewood: Float32Array;
	/** Holzfarbe RGB, je Pixel drei Werte */
	wood: Float32Array;
}

type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
	const v = Number.parseInt(hex.replace('#', ''), 16);
	return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

/** Auflösung der Texturen: so fein wie möglich innerhalb des Pixelbudgets. */
export function surfaceResolution(widthMm: number, heightMm: number): number {
	const { maxPixels, maxPxPerMm } = calibration.render;
	return Math.min(maxPxPerMm, Math.sqrt(maxPixels / (widthMm * heightMm)));
}

/** Deterministischer Zufall für die Wahl des Holzausschnitts. */
export function seededRandom(seed: number): () => number {
	let a = Math.floor(seed * 2654435761) >>> 0;
	return function next(): number {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export interface GrainWindow {
	/** Ursprung des Ausschnitts in Texturpixeln */
	x: number;
	y: number;
}

/**
 * Wählt einen Ausschnitt der Lärchenplatte. Passt das Label quer zur Faser in eine Lamelle,
 * liegt es vollständig darin (keine Leimfuge, keine Wiederholung).
 */
export function chooseGrainWindow(engraving: WoodEngraving, grainSeed: number, widthMm: number, heightMm: number): GrainWindow {
	const t = calibration.woodTexture;
	const rng = seededRandom(grainSeed);
	const alongPx = (engraving.grain === 'horizontal' ? widthMm : heightMm) / t.mmPerPx;
	const acrossPx = (engraving.grain === 'horizontal' ? heightMm : widthMm) / t.mmPerPx;
	const fitting = t.lamellae.filter((l) => l.length === 2 && l[1] - l[0] >= acrossPx + 4);
	const x = Math.max(0, rng() * (t.widthPx - alongPx));
	if (fitting.length > 0) {
		const lamella = fitting[Math.floor(rng() * fitting.length) % fitting.length];
		return { x, y: lamella[0] + 2 + rng() * (lamella[1] - lamella[0] - acrossPx - 4) };
	}
	return { x, y: Math.max(0, rng() * (t.heightPx - acrossPx)) };
}

// ---------------------------------------------------------------- Felder

/** Kastenfilter in beide Richtungen; mehrere Durchläufe nähern einen Gaußfilter an. */
export function blurField(src: Float32Array, w: number, h: number, radiusPx: number, passes = 3): Float32Array {
	const r = Math.round(radiusPx);
	if (r < 1) return src.slice();
	const a = src.slice();
	const b = new Float32Array(src.length);
	const norm = 1 / (2 * r + 1);
	for (let pass = 0; pass < passes; pass++) {
		for (let y = 0; y < h; y++) {
			const row = y * w;
			let sum = 0;
			for (let i = -r; i <= r; i++) sum += a[row + Math.min(w - 1, Math.max(0, i))];
			for (let x = 0; x < w; x++) {
				b[row + x] = sum * norm;
				sum += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
			}
		}
		for (let x = 0; x < w; x++) {
			let sum = 0;
			for (let i = -r; i <= r; i++) sum += b[Math.min(h - 1, Math.max(0, i)) * w + x];
			for (let y = 0; y < h; y++) {
				a[y * w + x] = sum * norm;
				sum += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
			}
		}
	}
	return a;
}

function hash(n: number): number {
	const s = Math.sin(n * 127.1) * 43758.5453;
	return s - Math.floor(s);
}

/** Weiches Rauschen (lineare Interpolation zwischen Zufallswerten im Abstand `period`). */
function smoothNoise(i: number, period: number, seed: number): number {
	const t = i / period;
	const k = Math.floor(t);
	const f = t - k;
	const s = f * f * (3 - 2 * f);
	return mix(hash(k + seed), hash(k + 1 + seed), s) - 0.5;
}

/**
 * Feine Faserstruktur quer zur Maserung (Pixelreihe für Pixelreihe), ergänzt das
 * vergrößerte Foto um Details im Bereich 0,2 bis 1,5 mm.
 */
function fiberProfile(count: number, pxPerMm: number, seed: number): Float32Array {
	const out = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		out[i] =
			smoothNoise(i, 0.25 * pxPerMm, seed) * 1.0 +
			smoothNoise(i, 0.6 * pxPerMm, seed * 1.7 + 11) * 0.8 +
			smoothNoise(i, 1.5 * pxPerMm, seed * 2.3 + 23) * 0.6;
	}
	return out;
}

function mix(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

const LUT_SIZE = 1024;

/** Vorberechnete Werte einer Oberflächenbehandlung (keine Arbeit pro Pixel). */
interface FinishProfile {
	tint: Rgb;
	lime: Rgb;
	saturation: number;
	/** Gamma als Tabelle über 0..1 */
	gamma: Float32Array;
	limeAmount: number;
}

function finishProfile(engraving: WoodEngraving, limeShare: number): FinishProfile {
	const f = calibration.finish[engraving.finish];
	const gamma = new Float32Array(LUT_SIZE + 1);
	for (let i = 0; i <= LUT_SIZE; i++) gamma[i] = Math.pow(i / LUT_SIZE, f.gamma);
	return {
		tint: hexToRgb(f.tint),
		lime: hexToRgb(calibration.limeColor),
		saturation: f.saturation,
		gamma,
		limeAmount: f.lime * limeShare
	};
}

/** Holzfarbe nach Oberflächenbehandlung, Ergebnis in `out[0..2]`. */
function applyFinish(p: FinishProfile, r: number, g: number, b: number, latewood: number, out: Float32Array): void {
	const lum = 0.299 * r + 0.587 * g + 0.114 * b;
	const limeAmount = clamp01(p.limeAmount * (0.7 + 0.6 * (1 - latewood)));
	const tr = p.gamma[(clamp01(lum + (r - lum) * p.saturation) * LUT_SIZE) | 0] * p.tint[0];
	const tg = p.gamma[(clamp01(lum + (g - lum) * p.saturation) * LUT_SIZE) | 0] * p.tint[1];
	const tb = p.gamma[(clamp01(lum + (b - lum) * p.saturation) * LUT_SIZE) | 0] * p.tint[2];
	out[0] = tr + (p.lime[0] - tr) * limeAmount;
	out[1] = tg + (p.lime[1] - tg) * limeAmount;
	out[2] = tb + (p.lime[2] - tb) * limeAmount;
}

/** Höhenfeld in mm: Gravur abgesenkt, Spätholz flacher, leichte Bodenstruktur. */
function heightField(input: SurfaceInput, walls: Float32Array, depth: number): Float32Array {
	const e = calibration.engraving;
	const { width: w, height: h } = input;
	const out = new Float32Array(w * h);
	for (let i = 0; i < w * h; i++) {
		if (walls[i] === 0) continue;
		const x = i % w;
		const y = (i - x) / w;
		const floor = (hash(x * 0.37 + y * 3.1) - 0.5) * e.floorNoiseMm;
		out[i] = -walls[i] * (depth * (1 - e.latewoodDepthReduction * input.latewood[i]) + floor);
	}
	return out;
}

/** Normalenkarte aus dem Höhenfeld; Grünkanal zeigt in Bildrichtung oben. */
function normalMap(height: Float32Array, w: number, h: number, pxPerMm: number): ImageData {
	const normal = new ImageData(w, h);
	const scale = pxPerMm / 2;
	for (let y = 0; y < h; y++) {
		const up = Math.max(0, y - 1) * w;
		const down = Math.min(h - 1, y + 1) * w;
		for (let x = 0; x < w; x++) {
			const i = y * w + x;
			const gx = (height[y * w + Math.min(w - 1, x + 1)] - height[y * w + Math.max(0, x - 1)]) * scale;
			const gy = (height[up + x] - height[down + x]) * scale;
			const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
			const o = i * 4;
			normal.data[o] = 127.5 - 127.5 * gx * inv;
			normal.data[o + 1] = 127.5 - 127.5 * gy * inv;
			normal.data[o + 2] = 127.5 + 127.5 * inv;
			normal.data[o + 3] = 255;
		}
	}
	return normal;
}

/**
 * Eigenschatten der Gravur: Ein Punkt am Gravurboden liegt im Schatten, wenn die
 * Wand in Lichtrichtung höher ist als der Lichtstrahl. 0 = beleuchtet, 1 = Schatten.
 */
export function shadowField(height: Float32Array, w: number, h: number, pxPerMm: number, lightAngleDeg: number, maxDepthMm: number): Float32Array {
	const out = new Float32Array(w * h);
	const tanEl = Math.tan((calibration.light.elevationDeg * Math.PI) / 180);
	const az = (lightAngleDeg * Math.PI) / 180;
	const dx = Math.cos(az);
	const dy = -Math.sin(az);
	const rise = tanEl / pxPerMm;
	const steps = Math.ceil((maxDepthMm / tanEl) * pxPerMm) + 1;
	const softness = 0.04;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = y * w + x;
			const h0 = height[i];
			if (h0 >= 0) continue;
			let shadow = 0;
			for (let t = 1; t <= steps; t++) {
				const qx = Math.round(x + dx * t);
				const qy = Math.round(y + dy * t);
				if (qx < 0 || qy < 0 || qx >= w || qy >= h) break;
				const ray = h0 + t * rise;
				if (ray >= 0) break;
				shadow = Math.max(shadow, clamp01((height[qy * w + qx] - ray) / softness));
				if (shadow >= 1) break;
			}
			out[i] = shadow;
		}
	}
	return out;
}

/** Berechnet Farbe, Normalen und Rauheit aus den gerasterten Feldern. */
export function composeSurface(input: SurfaceInput, engraving: WoodEngraving, surroundings: SurfaceSurroundings): Omit<SurfaceMaps, 'width' | 'height' | 'pxPerMm'> {
	const { width: w, height: h, pxPerMm } = input;
	const e = calibration.engraving;
	const finish = calibration.finish[engraving.finish];
	const isBurn = engraving.process !== 'fill';
	const burnBase = hexToRgb(e.burnColor[engraving.burn]);
	const paint = hexToRgb(calibration.fill.color[engraving.fillColor]);
	const woodFinish = finishProfile(engraving, 1);
	const burnFinish = finishProfile(engraving, calibration.limeInEngraving);

	const depth = e.depthMm[engraving.depth];
	const depthShare = depth / Math.max(e.depthMm.low, e.depthMm.medium, e.depthMm.high);
	// Gravurwände werden mit der Tiefe breiter (Strahlkegel)
	const walls = blurField(input.engraved, w, h, Math.max(0.6, Math.max(e.beamBlurMm, depth * e.wallTaper) * pxPerMm), 2);
	const cavity = blurField(input.engraved, w, h, depth * 1.2 * pxPerMm, 2);
	const halo = isBurn ? blurField(input.engraved, w, h, e.haloRadiusMm * pxPerMm / 1.4, 2) : null;
	const edgeCal = calibration.edge[engraving.edge];
	const edge = blurField(input.inside, w, h, edgeCal.topBurnWidthMm * pxPerMm, 1);
	const horizontal = engraving.grain === 'horizontal';
	const fibers = fiberProfile(horizontal ? h : w, pxPerMm, surroundings.grainSeed);
	const fiberDetail = calibration.woodTexture.fiberDetail;
	const lighten = e.latewoodColorLighten;
	const sealed = engraving.finish === 'oiled' || engraving.finish === 'lacquer';
	const engravedRough = isBurn ? e.roughness : calibration.fill.roughness;
	const insideRough = sealed ? Math.min(engravedRough, finish.roughness + 0.18) : engravedRough;

	const height = heightField(input, walls, depth);
	const normal = normalMap(height, w, h, pxPerMm);
	const shadow = shadowField(height, w, h, pxPerMm, surroundings.lightAngle, depth);
	const albedo = new ImageData(w, h);
	const roughness = new ImageData(w, h);
	const wood = new Float32Array(3);
	const burnt = new Float32Array(3);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = y * w + x;
			const o = i * 4;
			const lw = input.latewood[i];
			const m = input.engraved[i];
			const fiber = fibers[horizontal ? y : x] * fiberDetail;
			const r = clamp01(input.wood[i * 3] * (1 + fiber));
			const g = clamp01(input.wood[i * 3 + 1] * (1 + fiber));
			const b = clamp01(input.wood[i * 3 + 2] * (1 + fiber));
			applyFinish(woodFinish, r, g, b, lw, wood);
			const haloDark = halo ? e.haloStrength * clamp01((halo[i] - m) * 2.2) : 0;
			const edgeDark = edgeCal.topBurnStrength * clamp01(1 - (edge[i] - 0.5) * 2);
			const shade = (1 - haloDark) * (1 - edgeDark);

			if (m > 0 && isBurn) {
				const variation = 1 + (hash(x * 1.3 + y * 0.7) - 0.5) * 0.08;
				const k = lighten * lw;
				applyFinish(
					burnFinish,
					mix(burnBase[0], r, k) * variation,
					mix(burnBase[1], g, k) * variation,
					mix(burnBase[2], b, k) * variation,
					lw,
					burnt
				);
				burnt[0] *= finish.burnDarken;
				burnt[1] *= finish.burnDarken;
				burnt[2] *= finish.burnDarken;
			} else if (m > 0) {
				burnt[0] = paint[0];
				burnt[1] = paint[1];
				burnt[2] = paint[2];
			}
			// Gravurboden: an den Wänden und mit der Tiefe dunkler, dazu Eigenschatten
			const floorShade =
				(1 - e.cavityStrength * depthShare * (0.35 + clamp01((1 - cavity[i]) * 2))) * (1 - e.selfShadow * shadow[i]);
			const wallShade = 1 - e.selfShadow * shadow[i];
			albedo.data[o] = 255 * clamp01(mix(wood[0] * shade * wallShade, burnt[0] * floorShade, m));
			albedo.data[o + 1] = 255 * clamp01(mix(wood[1] * shade * wallShade, burnt[1] * floorShade, m));
			albedo.data[o + 2] = 255 * clamp01(mix(wood[2] * shade * wallShade, burnt[2] * floorShade, m));
			albedo.data[o + 3] = 255;

			const rough = 255 * clamp01(mix(finish.roughness + fiber * 0.5, insideRough, m));
			roughness.data[o] = rough;
			roughness.data[o + 1] = rough;
			roughness.data[o + 2] = rough;
			roughness.data[o + 3] = 255;
		}
	}
	return { albedo, normal, roughness };
}

/**
 * Vereinfachte, flach beleuchtete Ansicht für Geräte ohne WebGL:
 * Farbe mal (Umgebungslicht + gerichtetes Licht über die Normalen).
 */
export function shadeFlat(maps: SurfaceMaps, lightAngleDeg: number): ImageData {
	const el = (calibration.light.elevationDeg * Math.PI) / 180;
	const az = (lightAngleDeg * Math.PI) / 180;
	const lx = Math.cos(az) * Math.cos(el);
	const ly = Math.sin(az) * Math.cos(el);
	const lz = Math.sin(el);
	const out = new ImageData(maps.width, maps.height);
	for (let i = 0; i < maps.width * maps.height; i++) {
		const o = i * 4;
		const nx = maps.normal.data[o] / 127.5 - 1;
		const ny = maps.normal.data[o + 1] / 127.5 - 1;
		const nz = maps.normal.data[o + 2] / 127.5 - 1;
		const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz);
		const light = 0.45 + 0.75 * diffuse;
		for (let c = 0; c < 3; c++) out.data[o + c] = Math.min(255, maps.albedo.data[o + c] * light);
		out.data[o + 3] = 255;
	}
	return out;
}

// ---------------------------------------------------------------- Canvas-Adapter

function create2d(width: number, height: number): Result<CanvasRenderingContext2D, SurfaceError> {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	return ctx ? ok(ctx) : err({ kind: 'canvas-unavailable' });
}

function alphaField(ctx: CanvasRenderingContext2D, w: number, h: number): Float32Array {
	const data = ctx.getImageData(0, 0, w, h).data;
	const out = new Float32Array(w * h);
	for (let i = 0; i < w * h; i++) out[i] = data[i * 4 + 3] / 255;
	return out;
}

function rasterizeEngraving(ctx: CanvasRenderingContext2D, layout: LabelLayout, engraving: WoodEngraving, scale: number): void {
	const text = layout.lines.flatMap((l) => l.commands);
	ctx.fillStyle = '#fff';
	ctx.strokeStyle = '#fff';
	if (engraving.process === 'inverse') {
		ctx.beginPath();
		tracePath(ctx, layout.inverseField, scale);
		ctx.fill();
		ctx.globalCompositeOperation = 'destination-out';
		ctx.beginPath();
		tracePath(ctx, text, scale);
		ctx.fill('nonzero');
		ctx.globalCompositeOperation = 'source-over';
	} else {
		ctx.beginPath();
		tracePath(ctx, text, scale);
		ctx.fill('nonzero');
	}
	if (layout.frame.length > 0) {
		ctx.lineWidth = calibration.frame.lineWidthMm * scale;
		ctx.beginPath();
		tracePath(ctx, layout.frame, scale);
		ctx.stroke();
	}
}

function sampleWood(
	ctx: CanvasRenderingContext2D,
	image: CanvasImageSource,
	engraving: WoodEngraving,
	window: GrainWindow,
	pxPerMm: number
): void {
	const s = pxPerMm * calibration.woodTexture.mmPerPx;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	if (engraving.grain === 'horizontal') ctx.setTransform(s, 0, 0, s, -s * window.x, -s * window.y);
	// senkrecht: Textur transponiert, Faser entlang der Höhe
	else ctx.setTransform(0, s, s, 0, -s * window.y, -s * window.x);
	ctx.drawImage(image, 0, 0);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Rastert Gravur, Kontur und Holz und berechnet daraus die Texturen.
 * `pxPerMm` begrenzt die Auflösung, etwa für ein schnelles Zwischenbild.
 */
export function renderSurface(
	layout: LabelLayout,
	engraving: WoodEngraving,
	surroundings: SurfaceSurroundings,
	wood: WoodSource,
	maxPxPerMm = Infinity
): Result<SurfaceMaps, SurfaceError> {
	const pxPerMm = Math.min(maxPxPerMm, surfaceResolution(layout.width, layout.height));
	const w = Math.max(2, Math.round(layout.width * pxPerMm));
	const h = Math.max(2, Math.round(layout.height * pxPerMm));
	const scaleX = w / layout.width;
	const contexts = [create2d(w, h), create2d(w, h), create2d(w, h), create2d(w, h)];
	const [engravingCtx, insideCtx, colorCtx, latewoodCtx] = contexts;
	if (!engravingCtx.ok || !insideCtx.ok || !colorCtx.ok || !latewoodCtx.ok) return err({ kind: 'canvas-unavailable' });

	rasterizeEngraving(engravingCtx.value, layout, engraving, scaleX);
	insideCtx.value.fillStyle = '#fff';
	insideCtx.value.beginPath();
	tracePath(insideCtx.value, layout.outline, scaleX);
	insideCtx.value.fill();

	const window = chooseGrainWindow(engraving, surroundings.grainSeed, layout.width, layout.height);
	sampleWood(colorCtx.value, wood.color, engraving, window, scaleX);
	sampleWood(latewoodCtx.value, wood.latewood, engraving, window, scaleX);

	const colorData = colorCtx.value.getImageData(0, 0, w, h).data;
	const lateData = latewoodCtx.value.getImageData(0, 0, w, h).data;
	const woodRgb = new Float32Array(w * h * 3);
	const latewood = new Float32Array(w * h);
	for (let i = 0; i < w * h; i++) {
		woodRgb[i * 3] = colorData[i * 4] / 255;
		woodRgb[i * 3 + 1] = colorData[i * 4 + 1] / 255;
		woodRgb[i * 3 + 2] = colorData[i * 4 + 2] / 255;
		latewood[i] = lateData[i * 4] / 255;
	}
	const maps = composeSurface(
		{
			width: w,
			height: h,
			pxPerMm: scaleX,
			engraved: alphaField(engravingCtx.value, w, h),
			inside: alphaField(insideCtx.value, w, h),
			latewood,
			wood: woodRgb
		},
		engraving,
		surroundings
	);
	return ok({ width: w, height: h, pxPerMm: scaleX, ...maps });
}

/**
 * Zeichnet die Texturen flach beleuchtet auf eine Zeichenfläche. Mit `outline` (in mm) bleibt
 * alles außerhalb der Kontur leer, damit die Umgebung durchscheint.
 */
export function drawFlat(canvas: HTMLCanvasElement | undefined, maps: SurfaceMaps, lightAngleDeg: number, outline?: PathCommand[]): boolean {
	const ctx = canvas?.getContext('2d');
	if (!canvas || !ctx) return false;
	canvas.width = maps.width;
	canvas.height = maps.height;
	ctx.putImageData(shadeFlat(maps, lightAngleDeg), 0, 0);
	if (outline) {
		ctx.globalCompositeOperation = 'destination-in';
		ctx.beginPath();
		tracePath(ctx, outline, maps.pxPerMm);
		ctx.fill();
		ctx.globalCompositeOperation = 'source-over';
	}
	return true;
}

function loadImage(url: string): Promise<Result<HTMLImageElement, SurfaceError>> {
	return new Promise((resolve) => {
		const image = new Image();
		image.decoding = 'async';
		image.onload = () => resolve(ok(image));
		image.onerror = () => resolve(err({ kind: 'image-load', url }));
		image.src = url;
	});
}

export async function loadWoodSource(): Promise<Result<WoodSource, SurfaceError>> {
	const t = calibration.woodTexture;
	const [color, latewood] = await Promise.all([loadImage(t.colorUrl), loadImage(t.latewoodUrl)]);
	if (!color.ok) return color;
	if (!latewood.ok) return latewood;
	return ok({ color: color.value, latewood: latewood.value });
}
