<script lang="ts">
	// PROTOTYP, zum Wegwerfen: das geltende Kura neben einem Kura nach dem Vorbild der Muji-Drucksachen.
	// Beide laufen durch dieselbe Satzlogik wie die Produkte; was Kura nicht ausdrücken kann, kommt aus muji.ts.
	import SiteHeader from '$components/SiteHeader.svelte';
	import ExampleView from '$components/media/ExampleView.svelte';
	import { KURA } from '$lib/kura/kura';
	import { DAY_SHEET_EXAMPLE } from '$lib/products/daySheet';
	import { PRODUCTS } from '$lib/products/registry';
	import { useFont } from '$lib/typesetting/fontState.svelte';
	import { MUJI, MUJI_EXTRAS, layoutMujiDaySheet, mujiSvg } from './muji';

	const kuraFont = useFont(() => KURA.typeface);
	const mujiFont = useFont(() => MUJI.typeface);

	/** Pixel je mm: Holz größer, damit die Schrift auf 24 mm Höhe zu beurteilen ist */
	const SCALE: Record<string, number> = { holzlabel: 5, papierlabel: 3, tagesuebersicht: 3 };
	/** Ein Tisch für beide Spalten, damit Weiß, Naturpapier und Kraft gleich beleuchtet sind */
	const TABLE = '#dedad1';

	const rows = $derived.by(() => {
		const k = kuraFont.font;
		const m = mujiFont.font;
		if (!k || !m) return [];
		return PRODUCTS.map((product) => {
			const kura = product.examples(KURA, k);
			const muji = product.examples(MUJI, m);
			const day = product.id === 'tagesuebersicht' ? layoutMujiDaySheet(MUJI, DAY_SHEET_EXAMPLE, m) : null;
			return { product, kura, muji, day };
		});
	});

	const DIFFERENCES: { feature: string; kura: string; muji: string; beyond?: boolean }[] = [
		{ feature: 'Schrift', kura: 'Jost Regular, geometrisch', muji: 'Inter Tight Regular, neutrale Grotesk' },
		{ feature: 'Zeichen', kura: 'klein, 22 % gesperrt', muji: 'VERSAL, 8 % gesperrt' },
		{ feature: 'Text', kura: 'klein, 8 % gesperrt', muji: 'wie geschrieben, 2 % gesperrt' },
		{ feature: 'Versalhöhe Zeichen', kura: '9,375 % der Breite (Holz 6 mm)', muji: '7,5 % der Breite (Holz 4,8 mm)' },
		{ feature: 'Lesegröße Papier', kura: '3,4 mm', muji: '3,1 mm, gleiche x-Höhe' },
		{ feature: 'Feine Linien', kura: '0,25 mm', muji: '0,2 mm' },
		{ feature: 'Druckfarbe', kura: 'Schwarz', muji: 'warmes Schwarz, dazu Signalrot für die Tageszahl', beyond: true },
		{ feature: 'Papier', kura: 'Weiß', muji: 'Kraft (Etikett), Naturpapier (Tagesübersicht)', beyond: true },
		{ feature: 'Kopf Tagesübersicht', kura: 'Wochentag als Zeichen, Datum darunter', muji: 'Tageszahl 44 mm groß, daneben Wochentag, Monat; KW oben rechts', beyond: true },
		{ feature: 'Lärche', kura: 'geölt, schwarz gefüllt, scharfe Ecken', muji: 'unverändert' }
	];
</script>

<svelte:head>
	<title>Prototyp Kura Muji · Kura</title>
</svelte:head>

<div class="min-h-screen bg-ivory font-ui-body text-ink">
	<SiteHeader />

	<main class="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 pb-16 sm:px-6">
		<div class="flex flex-col gap-1 pt-2">
			<p class="text-sm text-clay-dark">Prototyp, zum Wegwerfen</p>
			<h1 class="font-ui-head text-3xl tracking-tight text-ink">Kura neben Kura Muji</h1>
			<p class="max-w-3xl text-ink-muted">
				Links das geltende Kura, rechts ein Kura nach dem Vorbild der Muji-Drucksachen. Beide setzt dieselbe Satzlogik wie die Produkte. Mit * markiert: geht über das hinaus, was Kura heute ausdrücken
				kann.
			</p>
		</div>

		<div class="overflow-x-auto rounded-2xl border border-line bg-white">
			<table class="w-full text-left text-sm" data-testid="differences">
				<thead class="text-ink-muted">
					<tr class="border-b border-line">
						<th class="px-4 py-2 font-normal">Merkmal</th>
						<th class="px-4 py-2 font-normal">Kura</th>
						<th class="px-4 py-2 font-normal">Kura Muji</th>
					</tr>
				</thead>
				<tbody>
					{#each DIFFERENCES as d (d.feature)}
						<tr class="border-b border-line last:border-0">
							<td class="px-4 py-2 text-ink-muted">{d.feature}</td>
							<td class="px-4 py-2">{d.kura}</td>
							<td class="px-4 py-2">{d.muji}{d.beyond ? ' *' : ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#each rows as { product, kura, muji, day } (product.id)}
			{@const scale = SCALE[product.id] ?? 3}
			{@const backdrop = product.medium.id === 'wood' ? kura[0]?.view.backdrop : TABLE}
			<article class="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5" data-product={product.id}>
				<h2 class="font-ui-head text-xl text-ink">{product.name}</h2>
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<section class="flex flex-col gap-2" aria-label="Kura" data-design="kura">
						<span class="text-sm text-ink-muted">Kura</span>
						<div class="flex flex-wrap items-end gap-x-5 gap-y-4 rounded-xl p-4 sm:p-6" style="background: {backdrop}">
							{#each kura as example (example.caption)}
								<figure class="flex flex-col gap-2" style="width: min(100%, {example.view.width * scale}px)">
									<ExampleView view={example.view} />
									<figcaption class="text-xs {product.medium.id === 'wood' ? 'text-white/80' : 'text-ink-muted'}">
										{example.caption}{example.hints.length ? ` · ${example.hints.length} Hinweise` : ''}
									</figcaption>
								</figure>
							{/each}
						</div>
					</section>
					<section class="flex flex-col gap-2" aria-label="Kura Muji" data-design="muji">
						<span class="text-sm text-ink-muted">Kura Muji</span>
						<div class="flex flex-wrap items-end gap-x-5 gap-y-4 rounded-xl p-4 sm:p-6" style="background: {backdrop}">
							{#if day}
								<figure class="flex flex-col gap-2" style="width: min(100%, {day.page.width * scale}px)">
									<div class="relative ring-1 ring-black/10" style="aspect-ratio: {day.page.width} / {day.page.height}; background: {MUJI_EXTRAS.paper.sheet}">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -- eigenes SVG aus Pfaden -->
										<div class="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full">{@html mujiSvg(MUJI, day.page)}</div>
									</div>
									<figcaption class="text-xs text-ink-muted">A4 hoch, Naturpapier{day.hints.length ? ` · ${day.hints.length} Hinweise` : ''}</figcaption>
								</figure>
							{:else}
								{#each muji as example (example.caption)}
									<figure class="flex flex-col gap-2" style="width: min(100%, {example.view.width * scale}px)">
										{#if example.view.medium === 'paper'}
											<div class="relative ring-1 ring-black/10" style="aspect-ratio: {example.view.width} / {example.view.height}; background: {MUJI_EXTRAS.paper.label}">
												<!-- eslint-disable-next-line svelte/no-at-html-tags -- eigenes SVG aus Pfaden -->
												<div class="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full">{@html example.view.svg}</div>
											</div>
										{:else}
											<ExampleView view={example.view} />
										{/if}
										<figcaption class="text-xs {product.medium.id === 'wood' ? 'text-white/80' : 'text-ink-muted'}">
											{example.caption}{example.view.medium === 'paper' ? ', Kraft' : ''}{example.hints.length ? ` · ${example.hints.length} Hinweise` : ''}
										</figcaption>
									</figure>
								{/each}
							{/if}
						</div>
					</section>
				</div>
			</article>
		{/each}
	</main>
</div>
