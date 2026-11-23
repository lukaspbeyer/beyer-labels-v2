/**
 * Oberflächenansicht eines Labels: nach jeder Änderung sofort ein gröberes Bild, die volle Auflösung,
 * sobald Ruhe ist. Hier liegen Schlüssel, Zwischenspeicher, Zeitablauf und Messwerte; wie ein Bild
 * gezeigt wird (3D-Szene, flache Ansicht, Draufsicht mit Umriss), bestimmt der Aufrufer über `show`.
 */
import type { Result } from '$utils/result';
import { calibration } from './calibration';
import { loadWoodSource, renderSurface, type SurfaceError, type SurfaceMaps, type SurfaceSurroundings, type WoodSource } from './surface';
import type { LabelLayout, WoodEngraving, WoodSurroundings } from './types';

export interface SurfaceFrame {
	maps: SurfaceMaps;
	quality: 'quick' | 'full';
	/** Rechenzeit dieses Bildes */
	ms: number;
	/** Laufende Nummer der gezeigten Bilder dieser Ansicht */
	count: number;
}

export interface SurfaceViewOptions {
	wood: WoodSource;
	/** Zeigt ein Bild mit dem Stand, für den es gerechnet oder aufgerufen wurde, samt Umgebung (Front, Blickwinkel, Licht) */
	show(frame: SurfaceFrame, layout: LabelLayout, engraving: WoodEngraving, surroundings: WoodSurroundings): void;
	/** Das schnelle Bild ließ sich nicht rechnen; ohne Angabe bleibt stehen, was zu sehen war */
	fail?(error: SurfaceError): void;
	/** Für Tests ersetzbar */
	render?: typeof renderSurface;
	now?: () => number;
}

export interface SurfaceView {
	/** Neuer Stand von Gravur oder Umgebung. Ändern sich nur Front oder Blickwinkel, wird nicht neu gerechnet, nur neu gezeigt. */
	update(layout: LabelLayout, engraving: WoodEngraving, surroundings: WoodSurroundings): void;
	dispose(): void;
}

/** Alles, was die Texturen bestimmt: die Gravur, ihr Layout und aus der Umgebung Holzausschnitt und Lichtrichtung. */
export function surfaceKey(layout: LabelLayout, engraving: WoodEngraving, surroundings: SurfaceSurroundings): string {
	return JSON.stringify([engraving, surroundings.grainSeed, surroundings.lightAngle, layout.width, layout.height, layout.lines.map((line) => line.commands.length)]);
}

export function createSurfaceView(options: SurfaceViewOptions): SurfaceView {
	const render = options.render ?? renderSurface;
	const now = options.now ?? (() => performance.now());
	let cached: { key: string; maps: SurfaceMaps } | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let count = 0;

	function show(maps: SurfaceMaps, quality: SurfaceFrame['quality'], start: number, layout: LabelLayout, engraving: WoodEngraving, surroundings: WoodSurroundings): void {
		count += 1;
		options.show({ maps, quality, ms: now() - start, count }, layout, engraving, surroundings);
	}

	function cancel(): void {
		if (timer !== null) clearTimeout(timer);
		timer = null;
	}

	return {
		update(layout, engraving, surroundings) {
			cancel();
			const start = now();
			const key = surfaceKey(layout, engraving, surroundings);
			if (cached?.key === key) {
				show(cached.maps, 'full', start, layout, engraving, surroundings);
				return;
			}
			const quick = render(layout, engraving, surroundings, options.wood, calibration.render.quickPxPerMm);
			if (!quick.ok) {
				options.fail?.(quick.error);
				return;
			}
			show(quick.value, 'quick', start, layout, engraving, surroundings);
			timer = setTimeout(() => {
				timer = null;
				const refineStart = now();
				const full = render(layout, engraving, surroundings, options.wood);
				if (!full.ok) return;
				cached = { key, maps: full.value };
				show(full.value, 'full', refineStart, layout, engraving, surroundings);
			}, calibration.render.refineDelayMs);
		},
		dispose: cancel
	};
}

/** Messwerte am Element, für Tests und Diagnose: data-render-count, data-render-quality, data-render-ms. */
export function recordFrame(element: HTMLElement | undefined, frame: SurfaceFrame): void {
	if (!element) return;
	element.dataset.renderCount = String(frame.count);
	element.dataset.renderQuality = frame.quality;
	element.dataset.renderMs = frame.ms.toFixed(1);
}

let source: Promise<Result<WoodSource, SurfaceError>> | null = null;

/** Das Lärchenfoto, einmal geladen und von allen Ansichten geteilt. Ein Fehlschlag wird beim nächsten Aufruf neu versucht. */
export function sharedWoodSource(): Promise<Result<WoodSource, SurfaceError>> {
	source ??= loadWoodSource().then((loaded) => {
		if (!loaded.ok) source = null;
		return loaded;
	});
	return source;
}
