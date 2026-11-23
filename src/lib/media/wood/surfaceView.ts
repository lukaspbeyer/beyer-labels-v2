/**
 * Oberflächenansicht eines Labels: nach jeder Änderung sofort ein gröberes Bild, die volle Auflösung,
 * sobald Ruhe ist. Hier liegen Schlüssel, Zwischenspeicher, Zeitablauf und Messwerte; wie ein Bild
 * gezeigt wird (3D-Szene, flache Ansicht, Draufsicht mit Umriss), bestimmt der Aufrufer über `show`.
 */
import type { Result } from '$utils/result';
import { calibration } from './calibration';
import { loadWoodSource, renderSurface, type SurfaceError, type SurfaceMaps, type WoodSource } from './surface';
import type { LabelLayout, WoodSettings } from './types';

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
	show(frame: SurfaceFrame, layout: LabelLayout, settings: WoodSettings): void;
	/** Das schnelle Bild ließ sich nicht rechnen; ohne Angabe bleibt stehen, was zu sehen war */
	fail?(error: SurfaceError): void;
	/** Für Tests ersetzbar */
	render?: typeof renderSurface;
	now?: () => number;
}

export interface SurfaceView {
	/** Neuer Stand von Layout oder Einstellungen. Ändert sich nur die Umgebung (Front, Blickwinkel), wird nicht neu gerechnet. */
	update(layout: LabelLayout, settings: WoodSettings): void;
	dispose(): void;
}

/** Alles, was die Texturen bestimmt. Front und Blickwinkel gehören nicht dazu, die Lichtrichtung schon (Eigenschatten der Gravur). */
export function surfaceKey(layout: LabelLayout, settings: WoodSettings): string {
	const { front: _front, view: _view, ...surface } = settings;
	return JSON.stringify([surface, layout.width, layout.height, layout.lines.map((line) => line.commands.length)]);
}

export function createSurfaceView(options: SurfaceViewOptions): SurfaceView {
	const render = options.render ?? renderSurface;
	const now = options.now ?? (() => performance.now());
	let cached: { key: string; maps: SurfaceMaps } | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let count = 0;

	function show(maps: SurfaceMaps, quality: SurfaceFrame['quality'], start: number, layout: LabelLayout, settings: WoodSettings): void {
		count += 1;
		options.show({ maps, quality, ms: now() - start, count }, layout, settings);
	}

	function cancel(): void {
		if (timer !== null) clearTimeout(timer);
		timer = null;
	}

	return {
		update(layout, settings) {
			cancel();
			const start = now();
			const key = surfaceKey(layout, settings);
			if (cached?.key === key) {
				show(cached.maps, 'full', start, layout, settings);
				return;
			}
			const quick = render(layout, settings, options.wood, calibration.render.quickPxPerMm);
			if (!quick.ok) {
				options.fail?.(quick.error);
				return;
			}
			show(quick.value, 'quick', start, layout, settings);
			timer = setTimeout(() => {
				timer = null;
				const refineStart = now();
				const full = render(layout, settings, options.wood);
				if (!full.ok) return;
				cached = { key, maps: full.value };
				show(full.value, 'full', refineStart, layout, settings);
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
