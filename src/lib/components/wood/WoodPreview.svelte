<script lang="ts">
	import { onMount } from 'svelte';
	import { calibration } from '$utils/wood/calibration';
	import type { LabelScene } from '$utils/wood/scene';
	import { loadWoodSource, renderSurface, shadeFlat, type SurfaceMaps, type WoodSource } from '$utils/wood/surface';
	import type { LabelLayout, WoodSettings } from '$utils/wood/types';

	interface Props {
		layout: LabelLayout | null;
		settings: WoodSettings;
	}

	let { layout, settings }: Props = $props();

	type Mode = 'loading' | '3d' | 'fallback' | 'error';
	let mode = $state<Mode>('loading');
	let wood = $state<WoodSource | null>(null);
	let scene = $state<LabelScene | null>(null);
	let stage: HTMLDivElement | undefined = $state();
	let fallbackCanvas: HTMLCanvasElement | undefined = $state();
	let root: HTMLDivElement | undefined = $state();

	// Zuletzt berechnete Texturen; Front und Ansicht brauchen keine Neuberechnung
	// (die Lichtrichtung schon, wegen des Eigenschattens in der Gravur)
	let cached: { key: string; maps: SurfaceMaps } | null = null;
	let renders = 0;

	function webglAvailable(): boolean {
		const probe = document.createElement('canvas');
		return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
	}

	function surfaceKey(l: LabelLayout, s: WoodSettings): string {
		const { front: _front, view: _view, ...surface } = s;
		return JSON.stringify([surface, l.width, l.height, l.lines.map((line) => line.commands.length)]);
	}

	async function createScene(target: HTMLElement): Promise<LabelScene | null> {
		try {
			const module = await import('$utils/wood/scene');
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
			const source = await loadWoodSource();
			if (!active) return;
			if (!source.ok) {
				mode = 'error';
				return;
			}
			wood = source.value;
			if (!stage || !webglAvailable()) {
				mode = 'fallback';
				return;
			}
			created = await createScene(stage);
			if (!active) {
				created?.dispose();
				return;
			}
			scene = created;
			mode = created ? '3d' : 'fallback';
		}

		void start();
		return () => {
			active = false;
			created?.dispose();
		};
	});

	function drawFallback(maps: SurfaceMaps, lightAngle: number): void {
		const ctx = fallbackCanvas?.getContext('2d');
		if (!fallbackCanvas || !ctx) return;
		fallbackCanvas.width = maps.width;
		fallbackCanvas.height = maps.height;
		ctx.putImageData(shadeFlat(maps, lightAngle), 0, 0);
	}

	function present(l: LabelLayout, s: WoodSettings, maps: SurfaceMaps): void {
		if (mode === '3d' && scene) scene.update(l, maps, s);
		else drawFallback(maps, s.lightAngle);
	}

	/** Messwerte am Element, für Tests und Diagnose. */
	function record(start: number, quality: 'quick' | 'full'): void {
		renders += 1;
		if (!root) return;
		root.dataset.renderCount = String(renders);
		root.dataset.renderQuality = quality;
		root.dataset.renderMs = (performance.now() - start).toFixed(1);
	}

	// Nach einer Änderung sofort ein gröberes Zwischenbild, volle Auflösung, sobald Ruhe ist
	$effect(() => {
		if (!layout || !wood || (mode !== '3d' && mode !== 'fallback')) return;
		const l = layout;
		const s = settings;
		const source = wood;
		const start = performance.now();
		const key = surfaceKey(l, s);
		if (cached?.key === key) {
			present(l, s, cached.maps);
			record(start, 'full');
			return;
		}
		const quick = renderSurface(l, s, source, calibration.render.quickPxPerMm);
		if (!quick.ok) {
			mode = 'error';
			return;
		}
		present(l, s, quick.value);
		record(start, 'quick');
		const timer = setTimeout(() => {
			const refineStart = performance.now();
			const full = renderSurface(l, s, source);
			if (!full.ok) return;
			cached = { key, maps: full.value };
			present(l, s, full.value);
			record(refineStart, 'full');
		}, calibration.render.refineDelayMs);
		return () => clearTimeout(timer);
	});
</script>

<div
	bind:this={root}
	class="relative h-full w-full overflow-hidden"
	style="background: {calibration.front.color[settings.front]}"
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
