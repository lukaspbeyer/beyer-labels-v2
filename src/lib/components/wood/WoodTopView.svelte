<script lang="ts">
	import { drawFlat } from '$lib/media/wood/surface';
	import { createSurfaceView, recordFrame, sharedWoodSource, type SurfaceView } from '$lib/media/wood/surfaceView';
	import type { LabelLayout, WoodSettings } from '$lib/media/wood/types';

	interface Props {
		layout: LabelLayout;
		settings: WoodSettings;
		/** Draufsicht als SVG; steht, bis das Holz geladen ist, und bleibt, wenn es nicht lädt */
		sketch: string;
	}

	let { layout, settings, sketch }: Props = $props();

	let view = $state.raw<SurfaceView | null>(null);
	let canvas: HTMLCanvasElement | undefined = $state();
	let drawn = $state(false);
	let root: HTMLDivElement | undefined = $state();

	$effect(() => {
		let live = true;
		let created: SurfaceView | null = null;
		sharedWoodSource().then((loaded) => {
			if (!live || !loaded.ok) return;
			// Dieselbe Oberfläche wie auf der Produktseite, als beleuchtete Draufsicht; außerhalb der Kontur bleibt das Bild leer
			created = createSurfaceView({
				wood: loaded.value,
				show(frame, l, s) {
					if (drawFlat(canvas, frame.maps, s.lightAngle, l.outline)) drawn = true;
					recordFrame(root, frame);
				}
			});
			view = created;
		});
		return () => {
			live = false;
			created?.dispose();
		};
	});

	$effect(() => {
		if (view && canvas) view.update(layout, settings);
	});
</script>

<div bind:this={root} class="relative" style="aspect-ratio: {layout.width} / {layout.height}" data-mode={drawn ? 'surface' : 'sketch'}>
	{#if !drawn}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- eigenes SVG aus Pfaden, kein fremder Text -->
		<div class="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full">{@html sketch}</div>
	{/if}
	<canvas bind:this={canvas} class="absolute inset-0 h-full w-full" class:invisible={!drawn} aria-label="Draufsicht des Labels"></canvas>
</div>
