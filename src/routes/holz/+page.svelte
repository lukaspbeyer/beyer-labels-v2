<script lang="ts">
	import SiteHeader from '$components/SiteHeader.svelte';
	import WoodControls from '$components/wood/WoodControls.svelte';
	import WoodPreview from '$components/wood/WoodPreview.svelte';
	import { KURA } from '$lib/kura/kura';
	import { checkWoodLabel } from '$lib/products/woodLabel';
	import { woodSettings } from '$stores/wood';
	import { createFontLoader, type FontLoader, type LoadedFont } from '$lib/typesetting/fonts';
	import { layoutLabel } from '$lib/media/wood/layout';
	import type { LabelLayout, WoodSettings } from '$lib/media/wood/types';
	import { buildSvg, exportFileName } from '$lib/media/wood/svgExport';

	let loader: FontLoader | null = null;
	// Schriftobjekte nicht reaktiv verpacken; nur der Austausch zählt
	let font = $state.raw<LoadedFont | null>(null);
	let fontError = $state(false);

	const settings = $derived($woodSettings);
	const fontId = $derived(settings.font);
	const fontWeight = $derived(settings.weight);
	// Layout und Einstellungen als Paar; erst neu, wenn die gewählte Schrift geladen ist,
	// bis dahin bleibt der letzte Stand stehen
	let lastRendered: { layout: LabelLayout; settings: WoodSettings } | null = null;
	const rendered = $derived.by(() => {
		if (font && font.id === settings.font && font.weight === settings.weight) {
			lastRendered = { layout: layoutLabel(settings, font), settings };
		}
		return lastRendered;
	});
	const layout = $derived(rendered?.layout ?? null);
	const warnings = $derived(rendered ? checkWoodLabel(KURA, rendered.layout, rendered.settings) : []);
	const fileName = $derived(rendered ? exportFileName(rendered.settings, rendered.layout) : '');

	$effect(() => {
		const id = fontId;
		const weight = fontWeight;
		loader ??= createFontLoader(fetch);
		let current = true;
		loader.load(id, weight).then((result) => {
			if (!current) return;
			fontError = !result.ok;
			if (result.ok && result.value !== font) font = result.value;
		});
		return () => {
			current = false;
		};
	});

	function download(): void {
		if (!rendered) return;
		const blob = new Blob([buildSvg(rendered.layout, rendered.settings)], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
</script>

<svelte:head>
	<title>Holzlabel · Kura</title>
	<meta name="description" content="Türlabels aus Lärche im Hausdesign Kura ansehen und als Laserdatei laden." />
	<link rel="preload" href="/fonts/jost/jost-latin-400-normal.woff" as="font" type="font/woff" crossorigin="anonymous" />
</svelte:head>

<div class="min-h-screen bg-ivory font-ui-body text-ink">
	<SiteHeader />

	<main class="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 pb-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-6">
		<section
			class="sticky top-0 z-20 h-[42vh] min-h-[240px] border-y border-line lg:top-4 lg:h-[calc(100vh-6.5rem)] lg:rounded-3xl lg:border"
			aria-label="Vorschau"
		>
			<div class="h-full w-full overflow-hidden lg:rounded-3xl">
				<WoodPreview layout={rendered?.layout ?? null} settings={rendered?.settings ?? settings} />
			</div>
		</section>

		<div class="flex flex-col gap-4 px-4 sm:px-6 lg:px-0">
			<div class="flex flex-col gap-1 pt-2">
				<h1 class="font-ui-head text-3xl tracking-tight text-ink">Holzlabel</h1>
				<p class="text-ink-muted">Hausdesign Kura in Lärche, mit dem CO<sub>2</sub>-Laser graviert. Wort eingeben, ansehen, Laserdatei laden.</p>
			</div>

			<div class="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
				<div class="flex items-baseline justify-between gap-3">
					<span class="text-sm text-ink-muted">Größe</span>
					<span class="font-ui-head text-lg tabular-nums">{layout ? `${layout.width} × ${layout.height} mm` : '–'}</span>
				</div>
				{#if fontError}
					<p class="rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink">Die Schrift konnte nicht geladen werden.</p>
				{/if}
				<div aria-live="polite">
					{#if warnings.length > 0}
						<ul class="flex flex-col gap-2" data-testid="warnings">
							{#each warnings as warning (warning.message)}
								<li class="flex gap-2 rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink" data-kind={warning.kind}>
									<span aria-hidden="true" class="font-ui-head text-clay-dark">!</span>{warning.message}
								</li>
							{/each}
						</ul>
					{:else if layout}
						<p class="text-sm text-ink-muted" data-testid="no-warnings">Keine Hinweise.</p>
					{/if}
				</div>
				<button
					type="button"
					class="min-h-12 rounded-xl bg-clay px-5 font-ui-head text-white transition-colors hover:bg-clay-dark disabled:opacity-50"
					disabled={!layout}
					onclick={download}
				>
					SVG herunterladen
				</button>
				{#if fileName}
					<p class="-mt-2 truncate text-center text-xs text-ink-muted">{fileName}</p>
				{/if}
			</div>

			<WoodControls />

			<footer class="flex flex-col gap-1 px-1 text-xs leading-relaxed text-ink-muted">
				<p>
					Ebenen der SVG: schwarz = Gravur (Fläche), blau = Rahmen (Linie), rot = Schnitt (Kontur). Befestigung mit
					doppelseitigem Klebeband.
				</p>
				<p>Holzfoto: „Larch Wood“ von Christine und Hagen Graf, bearbeitet.</p>
				<a class="inline-flex min-h-11 items-center self-start underline" href="https://creativecommons.org/licenses/by/2.0/"
					>Lizenz CC BY 2.0</a
				>
			</footer>
		</div>
	</main>
</div>
