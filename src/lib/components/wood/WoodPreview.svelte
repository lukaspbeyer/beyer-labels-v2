<script lang="ts">
	import { onMount } from 'svelte';
	import { calibration } from '$lib/media/wood/calibration';
	import { frontColor } from '$lib/media/wood/surroundings';
	import type { SheetLabel } from '$lib/media/wood/svgExport';
	import type { LabelScene } from '$lib/media/wood/scene';
	import { drawFlat } from '$lib/media/wood/surface';
	import { createSurfaceView, recordFrame, sharedWoodSource, type SurfaceView } from '$lib/media/wood/surfaceView';
	import type { WoodSurroundings } from '$lib/media/wood/types';

	interface Props {
		/** Das gesetzte Label; bis es gesetzt ist, steht nur die Front */
		label: SheetLabel | null;
		/** Front, Blickwinkel, Licht und Holzausschnitt; gehört der Seite, nicht dem Label */
		surroundings: WoodSurroundings;
	}

	let { label, surroundings }: Props = $props();
	const layout = $derived(label?.layout ?? null);

	type Mode = 'loading' | '3d' | 'fallback' | 'error';
	let mode = $state<Mode>('loading');
	let scene = $state.raw<LabelScene | null>(null);
	// Rechnet die Oberfläche; entsteht, sobald Holz und Darstellung feststehen
	let view = $state.raw<SurfaceView | null>(null);
	let stage: HTMLDivElement | undefined = $state();
	let fallbackCanvas: HTMLCanvasElement | undefined = $state();
	let root: HTMLDivElement | undefined = $state();

	function webglAvailable(): boolean {
		const probe = document.createElement('canvas');
		return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
	}

	async function createScene(target: HTMLElement): Promise<LabelScene | null> {
		try {
			const module = await import('$lib/media/wood/scene');
			const created = module.createLabelScene(target);
			return created.ok ? created.value : null;
		} catch {
			return null;
		}
	}

	onMount(() => {
		let active = true;
		let created: LabelScene | null = null;

		async function start(): Promise<void> {
			const source = await sharedWoodSource();
			if (!active) return;
			if (!source.ok) {
				mode = 'error';
				return;
			}
			if (stage && webglAvailable()) {
				created = await createScene(stage);
				if (!active) {
					created?.dispose();
					return;
				}
			}
			scene = created;
			mode = created ? '3d' : 'fallback';
			view = createSurfaceView({
				wood: source.value,
				show(frame, l, e, s) {
					if (scene) scene.update(l, frame.maps, e, s);
					else drawFlat(fallbackCanvas, frame.maps, s.lightAngle);
					recordFrame(root, frame);
				},
				fail: () => (mode = 'error')
			});
		}

		void start();
		return () => {
			active = false;
			view?.dispose();
			created?.dispose();
		};
	});

	$effect(() => {
		if (label && view) view.update(label.layout, label.engraving, surroundings);
	});
</script>

<div
	bind:this={root}
	class="relative h-full w-full overflow-hidden"
	style="background: {frontColor(surroundings.front)}"
	data-mode={mode}
>
	<div bind:this={stage} class="absolute inset-0" class:invisible={mode === 'fallback'}></div>

	{#if mode === 'fallback'}
		<div class="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
			<canvas
				bind:this={fallbackCanvas}
				class="max-h-[70%] max-w-[85%] rounded-sm shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
				aria-label="Vereinfachte Vorschau des Labels"
			></canvas>
			<p class="max-w-xs rounded-lg bg-white/85 px-3 py-2 text-center text-xs text-ink">
				3D-Vorschau auf diesem Gerät nicht verfügbar (kein WebGL). Vereinfachte Draufsicht.
			</p>
		</div>
	{:else if mode === 'loading'}
		<div class="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">Vorschau wird geladen …</div>
	{:else if mode === 'error'}
		<div class="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-ink">
			Die Vorschau konnte nicht erstellt werden. Export und Prüfungen funktionieren weiterhin.
		</div>
	{/if}

	{#if layout}
		<div class="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-xs text-ink backdrop-blur">
			Lärche · {calibration.label.thicknessMm} mm · {layout.width} × {layout.height} mm
		</div>
	{/if}
</div>
