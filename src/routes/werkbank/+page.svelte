<script lang="ts">
	import ControlGroup from '$components/ControlGroup.svelte';
	import Segmented from '$components/Segmented.svelte';
	import SiteHeader from '$components/SiteHeader.svelte';
	import WoodTopView from '$components/wood/WoodTopView.svelte';
	import Slider from '$components/Slider.svelte';
	import { KURA_RANGES, parseKura, type KuraValues } from '$lib/kura/kura';
	import current from '$lib/kura/kura.json';
	import { PRODUCTS } from '$lib/products/registry';
	import { createFontLoader, FONT_CATALOG, fontInfo, nearestWeight, type FontLoader, type LoadedFont } from '$lib/typesetting/fonts';
	import type { FontWeight } from '$lib/typesetting/types';

	// Arbeitskopie von Kura; wirksam wird sie erst, wenn sie als kura.json eingecheckt ist
	let draft = $state(structuredClone(current) as KuraValues);
	let loader: FontLoader | null = null;
	let font = $state.raw<LoadedFont | null>(null);
	let fontError = $state(false);
	let copied = $state(false);

	const parsed = $derived(parseKura($state.snapshot(draft)));
	const kura = $derived(parsed.ok ? parsed.value : null);
	const fontReady = $derived(font !== null && font.id === draft.typeface.font && font.weight === draft.typeface.weight);
	const products = $derived(
		kura && font && fontReady
			? PRODUCTS.map((product) => ({ product, examples: product.examples(kura, font!), notes: product.notes?.(kura, font!) ?? [] }))
			: []
	);
	const hintCount = $derived(products.reduce((n, p) => n + p.notes.length + p.examples.reduce((m, e) => m + e.hints.length, 0), 0));
	const json = $derived(JSON.stringify(draft, null, '\t') + '\n');
	const changes = $derived(diff(current, $state.snapshot(draft)));

	const WEIGHT_LABEL: Record<FontWeight, string> = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
	const weightOptions = $derived(fontInfo(draft.typeface.font).weights.map((value) => ({ value, label: WEIGHT_LABEL[value] })));
	const R = KURA_RANGES;

	$effect(() => {
		const { font: id, weight } = draft.typeface;
		loader ??= createFontLoader(fetch);
		let live = true;
		loader.load(id, weight).then((result) => {
			if (!live) return;
			fontError = !result.ok;
			if (result.ok) font = result.value;
		});
		return () => {
			live = false;
		};
	});

	/** Geänderte Werte als „pfad: alt → neu“ */
	function diff(before: unknown, after: unknown, path = ''): string[] {
		if (typeof before === 'object' && before !== null && typeof after === 'object' && after !== null) {
			return Object.keys(after).flatMap((key) =>
				diff((before as Record<string, unknown>)[key], (after as Record<string, unknown>)[key], path ? `${path}.${key}` : key)
			);
		}
		return before === after ? [] : [`${path}: ${String(before)} → ${String(after)}`];
	}

	function reset(): void {
		draft = structuredClone(current) as KuraValues;
	}

	async function copy(): Promise<void> {
		await navigator.clipboard.writeText(json);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function download(): void {
		const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = 'kura.json';
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
</script>

<svelte:head>
	<title>Werkbank · Kura</title>
	<meta name="description" content="Das Hausdesign Kura ansehen, anpassen und an allen Produkten prüfen." />
</svelte:head>

<div class="min-h-screen bg-ivory font-ui-body text-ink">
	<SiteHeader />

	<main class="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px]">
		<section class="flex flex-col gap-6" aria-label="Produkte in Kura">
			<div class="flex flex-col gap-1 pt-2">
				<h1 class="font-ui-head text-3xl tracking-tight text-ink">Werkbank</h1>
				<p class="text-ink-muted">Kura an einer Arbeitskopie verändern. Jede Änderung wirkt sofort auf alle Produkte, gilt aber erst nach dem Einchecken.</p>
			</div>

			{#if fontError}
				<p class="rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink">Die Schrift konnte nicht geladen werden.</p>
			{/if}
			{#if !parsed.ok}
				<ul class="flex flex-col gap-2" data-testid="problems">
					{#each parsed.error as problem (problem)}
						<li class="rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink">{problem}</li>
					{/each}
				</ul>
			{/if}

			<div class:opacity-50={!fontReady} class="flex flex-col gap-6 transition-opacity" data-testid="products" data-hints={hintCount}>
				{#each products as { product, examples, notes } (product.id)}
					<article class="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5" data-product={product.id}>
						<div class="flex items-baseline justify-between gap-3">
							<h2 class="font-ui-head text-xl text-ink">{product.name}</h2>
							<a href={product.href} class="flex min-h-11 items-center text-sm text-clay-dark underline">{product.medium} · öffnen</a>
						</div>
						<!-- Die Beispiele liegen maßstäblich (3 px je mm) vor ihrer Umgebung, wie in der Übersicht -->
						<div class="flex flex-wrap items-end gap-x-6 gap-y-5 rounded-xl p-4 sm:p-6" style="background: {examples[0]?.backdrop ?? 'var(--color-sand)'}">
							{#each examples as example (example.caption)}
								<figure class="flex flex-col gap-2" style="width: min(100%, {example.width * 3}px)">
									{#if example.wood}
										<WoodTopView layout={example.wood.layout} settings={example.wood.settings} sketch={example.svg} />
									{:else}
										<!-- eslint-disable-next-line svelte/no-at-html-tags -- eigenes SVG aus Pfaden, kein fremder Text -->
										<div class="bg-white ring-1 ring-line [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">{@html example.svg}</div>
									{/if}
									<figcaption class="flex flex-col gap-2 text-xs {example.backdrop ? 'text-ink' : 'text-ink-muted'}">
										{example.caption}
										{#each example.hints as hint (hint.message)}
											<span class="rounded-lg bg-clay-soft px-2 py-1 text-ink" data-kind={hint.kind}>{hint.message}</span>
										{/each}
									</figcaption>
								</figure>
							{/each}
						</div>
						{#each notes as note (note.message)}
							<p class="rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink" data-kind={note.kind}>{note.message}</p>
						{/each}
					</article>
				{/each}
			</div>
		</section>

		<aside class="flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto" aria-label="Kura anpassen">
			<div class="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
				<div class="flex items-baseline justify-between gap-3">
					<span class="text-sm text-ink-muted">Arbeitskopie</span>
					<span class="font-ui-head text-lg" data-testid="status">
						{changes.length === 0 ? 'unverändert' : `${changes.length} ${changes.length === 1 ? 'Änderung' : 'Änderungen'}`}
					</span>
				</div>
				{#if changes.length > 0}
					<ul class="flex flex-col gap-1 text-xs text-ink-muted" data-testid="changes">
						{#each changes as change (change)}
							<li class="break-words">{change}</li>
						{/each}
					</ul>
					<p class="text-sm text-ink-muted">
						{hintCount === 0 ? 'Alle Produkte ohne Hinweis.' : `${hintCount} ${hintCount === 1 ? 'Hinweis' : 'Hinweise'} an den Produkten.`}
						Wirksam wird die Änderung erst, wenn diese Datei als <code>src/lib/kura/kura.json</code> eingecheckt ist.
					</p>
					<div class="grid grid-cols-2 gap-2">
						<button type="button" class="min-h-11 rounded-xl bg-clay px-3 font-ui-head text-sm text-white hover:bg-clay-dark disabled:opacity-50" disabled={!parsed.ok} onclick={download}>
							kura.json laden
						</button>
						<button type="button" class="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink hover:border-ink-muted disabled:opacity-50" disabled={!parsed.ok} onclick={copy}>
							{copied ? 'Kopiert' : 'Kopieren'}
						</button>
					</div>
					<button type="button" class="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink hover:border-ink-muted" onclick={reset}>Zurücksetzen</button>
				{/if}
			</div>

			<ControlGroup title="Schrift" summary={`${fontInfo(draft.typeface.font).name} ${WEIGHT_LABEL[draft.typeface.weight]}`} open>
				<div class="grid grid-cols-2 gap-2" role="group" aria-label="Schriftart">
					{#each FONT_CATALOG as f (f.id)}
						<button
							type="button"
							class="flex min-h-14 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors
								{f.id === draft.typeface.font ? 'border-clay bg-clay-soft' : 'border-line bg-white hover:border-ink-muted'}"
							aria-pressed={f.id === draft.typeface.font}
							onclick={() => (draft.typeface = { font: f.id, weight: nearestWeight(f.id, draft.typeface.weight) })}
						>
							<span class="text-lg leading-tight text-ink" style="font-family: '{f.cssFamily}'; font-weight: {nearestWeight(f.id, draft.typeface.weight)}">teller</span>
							<span class="text-xs text-ink-muted">{f.name}</span>
						</button>
					{/each}
				</div>
				<Segmented label="Gewicht" options={weightOptions} value={draft.typeface.weight} onchange={(weight) => (draft.typeface.weight = weight)} />
			</ControlGroup>

			<ControlGroup title="Zeichen" summary={`${draft.sign.trackingPercent} % gesperrt`}>
				<Segmented
					label="Schreibweise"
					options={[
						{ value: 'lower', label: 'klein' },
						{ value: 'upper', label: 'VERSAL' },
						{ value: 'as-typed', label: 'Wie eingegeben' }
					]}
					value={draft.sign.case}
					onchange={(v) => (draft.sign.case = v)}
				/>
				<Slider label="Laufweite" unit="%" min={R['sign.trackingPercent'][0]} max={R['sign.trackingPercent'][1]} step={1} value={draft.sign.trackingPercent} onchange={(v) => (draft.sign.trackingPercent = v)} />
				<Segmented
					label="Ausrichtung"
					options={[
						{ value: 'left', label: 'Links' },
						{ value: 'center', label: 'Mittig' },
						{ value: 'right', label: 'Rechts' }
					]}
					value={draft.sign.align}
					onchange={(v) => (draft.sign.align = v)}
				/>
			</ControlGroup>

			<ControlGroup title="Text" summary={`${draft.text.trackingPercent} % gesperrt · ${draft.paper.textCapHeight.toFixed(1).replace('.', ',')} mm`}>
				<Segmented
					label="Schreibweise"
					options={[
						{ value: 'as-typed', label: 'Wie eingegeben' },
						{ value: 'lower', label: 'klein' },
						{ value: 'upper', label: 'VERSAL' }
					]}
					value={draft.text.case}
					onchange={(v) => (draft.text.case = v)}
				/>
				<Slider label="Laufweite" unit="%" min={R['text.trackingPercent'][0]} max={R['text.trackingPercent'][1]} step={1} value={draft.text.trackingPercent} onchange={(v) => (draft.text.trackingPercent = v)} />
				<Slider label="Lesegröße auf Papier (Versalhöhe)" unit="mm" min={R['paper.textCapHeight'][0]} max={R['paper.textCapHeight'][1]} step={0.1} decimals={1} value={draft.paper.textCapHeight} onchange={(v) => (draft.paper.textCapHeight = v)} />
				<Slider label="Feine Linien" unit="mm" min={R['paper.ruleWidth'][0]} max={R['paper.ruleWidth'][1]} step={0.05} decimals={2} value={draft.paper.ruleWidth} onchange={(v) => (draft.paper.ruleWidth = v)} />
			</ControlGroup>

			<ControlGroup title="Schrift zu Fläche" summary={`${(draft.proportion.capHeightPerWidth * 100).toFixed(1).replace('.', ',')} % der Breite`}>
				<Slider label="Versalhöhe je Breite" unit="%" min={R['proportion.capHeightPerWidth'][0] * 100} max={R['proportion.capHeightPerWidth'][1] * 100} step={0.125} decimals={3} value={draft.proportion.capHeightPerWidth * 100} onchange={(v) => (draft.proportion.capHeightPerWidth = v / 100)} />
				<Slider label="Versalhöhe höchstens je Höhe" unit="%" min={R['proportion.capHeightPerHeight'][0] * 100} max={R['proportion.capHeightPerHeight'][1] * 100} step={1} value={draft.proportion.capHeightPerHeight * 100} onchange={(v) => (draft.proportion.capHeightPerHeight = v / 100)} />
				<Slider label="Wort höchstens je Breite" unit="%" min={R['proportion.maxSignWidthRatio'][0] * 100} max={R['proportion.maxSignWidthRatio'][1] * 100} step={0.5} decimals={1} value={draft.proportion.maxSignWidthRatio * 100} onchange={(v) => (draft.proportion.maxSignWidthRatio = v / 100)} />
			</ControlGroup>

			<ControlGroup title="Unterzeile" summary={`${Math.round(draft.subLine.capRatio * 100)} % der Hauptzeile`}>
				<Slider label="Größe relativ zur Hauptzeile" unit="%" min={R['subLine.capRatio'][0] * 100} max={R['subLine.capRatio'][1] * 100} step={1} value={draft.subLine.capRatio * 100} onchange={(v) => (draft.subLine.capRatio = v / 100)} />
				<Slider label="Abstand" unit="× Versalhöhe" min={R['subLine.lineSpacing'][0]} max={R['subLine.lineSpacing'][1]} step={0.05} decimals={2} value={draft.subLine.lineSpacing} onchange={(v) => (draft.subLine.lineSpacing = v)} />
			</ControlGroup>

			<ControlGroup title="Lärche" summary="Gravur, Oberfläche, Form">
				<Segmented
					label="Verfahren"
					options={[
						{ value: 'dark', label: 'Dunkel graviert' },
						{ value: 'inverse', label: 'Invers' },
						{ value: 'fill', label: 'Gefüllt' }
					]}
					value={draft.wood.process}
					onchange={(v) => (draft.wood.process = v)}
				/>
				<Segmented
					label="Tiefe"
					options={[
						{ value: 'low', label: 'Flach' },
						{ value: 'medium', label: 'Mittel' },
						{ value: 'high', label: 'Tief' }
					]}
					value={draft.wood.depth}
					onchange={(v) => (draft.wood.depth = v)}
				/>
				{#if draft.wood.process === 'fill'}
					<Segmented
						label="Füllfarbe"
						options={[
							{ value: 'black', label: 'Schwarz' },
							{ value: 'white', label: 'Weiß' },
							{ value: 'anthracite', label: 'Anthrazit' }
						]}
						value={draft.wood.fillColor}
						onchange={(v) => (draft.wood.fillColor = v)}
					/>
				{:else}
					<Segmented
						label="Brennfarbe"
						options={[
							{ value: 'low', label: 'Hell' },
							{ value: 'medium', label: 'Mittel' },
							{ value: 'high', label: 'Dunkel' }
						]}
						value={draft.wood.burn}
						onchange={(v) => (draft.wood.burn = v)}
					/>
				{/if}
				<Segmented
					label="Oberfläche"
					options={[
						{ value: 'raw', label: 'Roh' },
						{ value: 'oiled', label: 'Geölt' },
						{ value: 'lacquer', label: 'Lack matt' },
						{ value: 'limed', label: 'Gekalkt' }
					]}
					value={draft.wood.finish}
					onchange={(v) => (draft.wood.finish = v)}
				/>
				<Segmented
					label="Form"
					options={[
						{ value: 'rectangle', label: 'Rechteck' },
						{ value: 'pill', label: 'Pille' },
						{ value: 'oval', label: 'Oval' }
					]}
					value={draft.wood.shape}
					onchange={(v) => (draft.wood.shape = v)}
				/>
				{#if draft.wood.shape === 'rectangle'}
					<Slider label="Eckradius" unit="mm" min={R['wood.cornerRadius'][0]} max={R['wood.cornerRadius'][1]} step={0.5} decimals={1} value={draft.wood.cornerRadius} onchange={(v) => (draft.wood.cornerRadius = v)} />
				{/if}
				<Segmented
					label="Rahmenlinie"
					options={[
						{ value: false, label: 'Ohne' },
						{ value: true, label: 'Mit Rahmen' }
					]}
					value={draft.wood.frame}
					onchange={(v) => (draft.wood.frame = v)}
				/>
				<Segmented
					label="Kante"
					options={[
						{ value: 'burnt', label: 'Gebrannt' },
						{ value: 'sanded', label: 'Geschliffen' }
					]}
					value={draft.wood.edge}
					onchange={(v) => (draft.wood.edge = v)}
				/>
				<Segmented
					label="Maserung"
					options={[
						{ value: 'horizontal', label: 'Waagerecht' },
						{ value: 'vertical', label: 'Senkrecht' }
					]}
					value={draft.wood.grain}
					onchange={(v) => (draft.wood.grain = v)}
				/>
			</ControlGroup>

			<p class="px-1 text-xs leading-relaxed text-ink-muted">Papier druckt immer in Schwarz. Holzlabels zeigt diese Seite als beleuchtete Draufsicht aus demselben Renderer wie die Produktseite; die räumliche Ansicht steht dort.</p>
		</aside>
	</main>
</div>
