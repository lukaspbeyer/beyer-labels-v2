<script lang="ts" module>
	import { loadWoodSource, type SurfaceError, type WoodSource } from '$lib/media/wood/surface';
	import type { Result } from '$utils/result';

	// Das Lärchenfoto wird einmal geladen und von allen Ansichten der Seite geteilt
	let source: Promise<Result<WoodSource, SurfaceError>> | null = null;
</script>

<script lang="ts">
	import { calibration } from '$lib/media/wood/calibration';
	import { renderSurface, shadeFlat, type SurfaceMaps } from '$lib/media/wood/surface';
	import type { LabelLayout, WoodSettings } from '$lib/media/wood/types';
	import { tracePath } from '$lib/typesetting/geometry';

	interface Props {
		layout: LabelLayout;
		settings: WoodSettings;
		/** Draufsicht als SVG; steht, bis das Holz geladen ist, und bleibt, wenn es nicht lädt */
		sketch: string;
	}

	let { layout, settings, sketch }: Props = $props();

	let wood = $state.raw<WoodSource | null>(null);
	let canvas: HTMLCanvasElement | undefined = $state();
	let drawn = $state(false);
	let root: HTMLDivElement | undefined = $state();
	let lastKey = '';
	let renders = 0;

	$effect(() => {
		let live = true;
		source ??= loadWoodSource();
		source.then((loaded) => {
			if (live && loaded.ok) wood = loaded.value;
		});
		return () => {
			live = false;
		};
	});

	/** Die Karten des Renderers als beleuchtete Draufsicht; außerhalb der Kontur bleibt das Bild leer. */
	function draw(maps: SurfaceMaps, l: LabelLayout, lightAngle: number): void {
		const ctx = canvas?.getContext('2d');
		if (!canvas || !ctx) return;
		canvas.width = maps.width;
		canvas.height = maps.height;
		ctx.putImageData(shadeFlat(maps, lightAngle), 0, 0);
		ctx.globalCompositeOperation = 'destination-in';
		ctx.beginPath();
		tracePath(ctx, l.outline, maps.pxPerMm);
		ctx.fill();
		ctx.globalCompositeOperation = 'source-over';
		drawn = true;
	}

	/** Messwerte am Element, für Tests und Diagnose. */
	function record(start: number, quality: 'quick' | 'full'): void {
		renders += 1;
		if (!root) return;
		root.dataset.renderCount = String(renders);
		root.dataset.renderQuality = quality;
		root.dataset.renderMs = (performance.now() - start).toFixed(1);
	}

	// Wie die Produktseite: sofort ein gröberes Bild, volle Auflösung, sobald Ruhe ist.
	// Front und Blickwinkel ändern die Draufsicht nicht.
	$effect(() => {
		if (!wood || !canvas) return;
		const l = layout;
		const s = settings;
		const from = wood;
		const { front: _front, view: _view, ...surface } = s;
		const key = JSON.stringify([surface, l.width, l.height]);
		if (key === lastKey) return;
		const start = performance.now();
		const quick = renderSurface(l, s, from, calibration.render.quickPxPerMm);
		if (!quick.ok) return;
		draw(quick.value, l, s.lightAngle);
		record(start, 'quick');
		const timer = setTimeout(() => {
			const refineStart = performance.now();
			const full = renderSurface(l, s, from);
			if (!full.ok) return;
			lastKey = key;
			draw(full.value, l, s.lightAngle);
			record(refineStart, 'full');
		}, calibration.render.refineDelayMs);
		return () => clearTimeout(timer);
	});
</script>

<div bind:this={root} class="relative" style="aspect-ratio: {layout.width} / {layout.height}" data-mode={drawn ? 'surface' : 'sketch'}>
	{#if !drawn}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- eigenes SVG aus Pfaden, kein fremder Text -->
		<div class="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full">{@html sketch}</div>
	{/if}
	<canvas bind:this={canvas} class="absolute inset-0 h-full w-full" class:invisible={!drawn} aria-label="Draufsicht des Labels"></canvas>
</div>
