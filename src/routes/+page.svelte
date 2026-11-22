<script lang="ts">
	import SiteHeader from '$components/SiteHeader.svelte';
	import WoodTopView from '$components/wood/WoodTopView.svelte';
	import { KURA } from '$lib/kura/kura';
	import { PRODUCTS } from '$lib/products/registry';
	import { createFontLoader, fontInfo, type LoadedFont } from '$lib/typesetting/fonts';

	// Schriftobjekte nicht reaktiv verpacken; nur der Austausch zählt
	let font = $state.raw<LoadedFont | null>(null);
	let fontError = $state(false);

	// Je Produkt das erste Beispiel im geltenden Kura
	const tiles = $derived(PRODUCTS.map((product) => ({ product, example: font ? product.examples(KURA, font)[0] : null })));

	$effect(() => {
		createFontLoader(fetch)
			.load(KURA.typeface.font, KURA.typeface.weight)
			.then((result) => {
				fontError = !result.ok;
				if (result.ok) font = result.value;
			});
	});
</script>

<svelte:head>
	<title>Kura · Hausdesign</title>
	<meta name="description" content="Drucksachen und gravierte Schilder im Hausdesign Kura." />
</svelte:head>

<div class="min-h-screen bg-ivory font-ui-body text-ink">
	<SiteHeader />

	<main class="mx-auto flex max-w-[1400px] flex-col gap-8 px-4 pb-16 sm:px-6">
		<div class="flex max-w-2xl flex-col gap-2 pt-2">
			<h1 class="font-ui-head text-3xl tracking-tight text-ink">Kura</h1>
			<p class="text-ink-muted">Das Hausdesign für alles, was im Haus beschriftet, gedruckt oder graviert wird: ruhig, klar, wenig.</p>
		</div>

		{#if fontError}
			<p class="rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink">Die Schrift konnte nicht geladen werden.</p>
		{/if}

		<ul class="grid grid-cols-1 gap-5 md:grid-cols-3" data-testid="products">
			{#each tiles as { product, example } (product.id)}
				<li>
					<a href={product.href} class="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-colors hover:border-ink-muted" data-product={product.id}>
						<!-- Alle Kacheln gleich hoch; die Sache steht maßstäblich verkleinert vor ihrer Umgebung -->
						<div class="relative aspect-[4/3]" style="background: {example?.backdrop ?? 'var(--color-sand)'}">
							{#if example}
								<div class="absolute inset-6 flex items-center justify-center sm:inset-8">
									<div
										class={example.wood ? '' : 'bg-white ring-1 ring-line [&>svg]:block [&>svg]:h-full [&>svg]:w-full'}
										style="aspect-ratio: {example.width} / {example.height}; {example.width / example.height > 4 / 3 ? 'width: 100%' : 'height: 100%'}"
									>
										{#if example.wood}
											<WoodTopView layout={example.wood.layout} settings={example.wood.settings} sketch={example.svg} />
										{:else}
											<!-- eslint-disable-next-line svelte/no-at-html-tags -- eigenes SVG aus Pfaden, kein fremder Text -->
											{@html example.svg}
										{/if}
									</div>
								</div>
							{/if}
						</div>
						<div class="flex flex-1 flex-col gap-1 border-t border-line p-5">
							<div class="flex items-baseline justify-between gap-3">
								<h2 class="font-ui-head text-xl text-ink">{product.name}</h2>
								<span class="text-xs text-ink-muted">{product.medium}</span>
							</div>
							<p class="text-sm leading-relaxed text-ink-muted">{product.summary}</p>
							<span class="mt-auto pt-3 text-sm text-clay-dark group-hover:underline">öffnen</span>
						</div>
					</a>
				</li>
			{/each}
		</ul>

		<a href="/werkbank" class="flex flex-col gap-1 rounded-2xl border border-line bg-white p-5 transition-colors hover:border-ink-muted sm:flex-row sm:items-center sm:justify-between sm:gap-6">
			<span class="flex flex-col gap-1">
				<span class="font-ui-head text-xl text-ink">Werkbank</span>
				<span class="text-sm text-ink-muted">Das Design selbst verändern und an allen Produkten zugleich prüfen.</span>
			</span>
			<span class="text-sm text-ink-muted">
				{fontInfo(KURA.typeface.font).name} · Zeichen {KURA.sign.trackingPercent} % gesperrt · Text {KURA.text.trackingPercent} %
			</span>
		</a>
	</main>
</div>
