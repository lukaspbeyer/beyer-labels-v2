<script lang="ts">
	import SiteHeader from '$components/SiteHeader.svelte';
	import ControlGroup from '$components/ControlGroup.svelte';
	import Segmented from '$components/Segmented.svelte';
	import { KURA } from '$lib/kura/kura';
	import { pageSvg } from '$lib/media/paper/page';
	import {
		checkPaperLabel,
		DEFAULT_PAPER_LABEL_INPUT,
		layoutPaperLabel,
		PAPER_LABEL_FORMATS,
		paperLabelFileName,
		paperSheetPage,
		placeOf,
		positionCount,
		type PaperLabelFormatId
	} from '$lib/products/paperLabel';
	import { createFontLoader, type LoadedFont } from '$lib/typesetting/fonts';
	import { saveFile } from '$utils/download';

	interface Cell {
		text: string;
		subText: string;
	}

	let formatId = $state<PaperLabelFormatId>(DEFAULT_PAPER_LABEL_INPUT.format);
	// Je Platz auf dem Bogen ein Etikett; ein Platz ohne Wort bleibt frei. Der Inhalt lebt nur in dieser Seite.
	let cells = $state<Record<number, Cell>>({ 0: { text: DEFAULT_PAPER_LABEL_INPUT.text, subText: '' } });
	let selected = $state(0);
	// Schriftobjekte nicht reaktiv verpacken; nur der Austausch zählt
	let font = $state.raw<LoadedFont | null>(null);
	let fontError = $state(false);
	let busy = $state(false);

	const format = $derived(PAPER_LABEL_FORMATS[formatId]);
	const positions = $derived(Array.from({ length: positionCount(formatId) }, (_, i) => i));
	const current = $derived(cells[selected] ?? { text: '', subText: '' });
	const labels = $derived(
		font
			? positions
					.filter((position) => cells[position]?.text.trim())
					.map((position) => {
						const layout = layoutPaperLabel(KURA, { ...cells[position], format: formatId, position }, font!);
						return { position, text: cells[position].text.trim(), layout, hints: checkPaperLabel(KURA, layout) };
					})
			: []
	);
	const hints = $derived(labels.flatMap((label) => label.hints.map((hint) => ({ ...hint, where: placeName(label.position) }))));
	const sheet = $derived(font ? paperSheetPage(formatId, labels) : null);
	const preview = $derived(sheet ? pageSvg(sheet, KURA.paper.ink) : '');
	const fileName = $derived(labels.length > 0 ? paperLabelFileName({ text: labels[0].text, format: formatId }, labels.length) : '');

	const FORMAT_IDS: readonly PaperLabelFormatId[] = ['label', 'sign'];
	const formatOptions = FORMAT_IDS.map((value) => {
		const f = PAPER_LABEL_FORMATS[value];
		return { value, label: `${f.name} ${f.width} × ${f.height}` };
	});

	$effect(() => {
		createFontLoader(fetch)
			.load(KURA.typeface.font, KURA.typeface.weight)
			.then((result) => {
				fontError = !result.ok;
				if (result.ok) font = result.value;
			});
	});

	function placeName(position: number): string {
		const { column, row } = placeOf(formatId, position);
		return positions.length > 1 ? `Spalte ${column}, Zeile ${row}` : '';
	}

	function textValue(event: Event): string {
		const target = event.currentTarget;
		return target instanceof HTMLInputElement ? target.value : '';
	}

	function edit(change: Partial<Cell>): void {
		cells[selected] = { ...current, ...change };
	}

	function clear(): void {
		delete cells[selected];
	}

	function clearAll(): void {
		cells = {};
		selected = 0;
	}

	function setFormat(next: PaperLabelFormatId): void {
		formatId = next;
		// Etiketten auf Plätzen, die der neue Bogen nicht hat, entfallen
		for (const key of Object.keys(cells)) if (Number(key) >= positionCount(next)) delete cells[Number(key)];
		selected = 0;
	}

	async function download(): Promise<void> {
		if (!sheet || labels.length === 0) return;
		busy = true;
		try {
			// Die PDF-Bibliothek erst laden, wenn gedruckt wird
			const { renderPdf } = await import('$lib/media/paper/pdf');
			saveFile(await renderPdf([sheet], KURA.paper.ink, labels[0].text), fileName, 'application/pdf');
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Papierlabel · Kura</title>
	<meta name="description" content="Etiketten im Hausdesign Kura ansehen und als PDF für den Druck laden." />
</svelte:head>

<div class="min-h-screen bg-ivory font-ui-body text-ink">
	<SiteHeader />

	<main class="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 pb-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-6">
		<section
			class="sticky top-0 z-20 flex h-[42vh] min-h-[240px] items-center justify-center border-y border-line bg-sand p-4 lg:top-4 lg:h-[calc(100vh-6.5rem)] lg:rounded-3xl lg:border lg:p-8"
			aria-label="Vorschau"
		>
			<!-- Bogen maßstäblich; die Etikettengrenzen zeigt nur die Vorschau, gedruckt werden sie nicht -->
			<div
				class="relative max-h-full max-w-full bg-white shadow-sm ring-1 ring-line"
				style="aspect-ratio: {format.sheet.width} / {format.sheet.height}; height: 100%;"
				data-testid="sheet"
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- eigenes SVG aus Pfaden, kein fremder Text -->
				<div class="absolute inset-0 [&>svg]:h-full [&>svg]:w-full">{@html preview}</div>
				<!-- Die Plätze liegen über dem Druckbild: antippen wählt das Etikett -->
				<div
					class="absolute left-0 top-0 grid"
					style="width: {(format.width * format.sheet.columns * 100) / format.sheet.width}%; height: {(format.height * format.sheet.rows * 100) /
						format.sheet.height}%; grid-template-columns: repeat({format.sheet.columns}, 1fr); grid-template-rows: repeat({format.sheet.rows}, 1fr);"
					role="group"
					aria-label="Plätze auf dem Bogen"
				>
					{#each positions as position (position)}
						<button
							type="button"
							class="border transition-colors {position === selected ? 'border-clay bg-clay/5' : 'border-dashed border-line hover:border-ink-muted'}"
							aria-pressed={position === selected}
							aria-label={`${placeName(position) || 'Schild'}: ${cells[position]?.text.trim() || 'frei'}`}
							data-place={position}
							onclick={() => (selected = position)}
						></button>
					{/each}
				</div>
			</div>
		</section>

		<div class="flex flex-col gap-4 px-4 sm:px-6 lg:px-0">
			<div class="flex flex-col gap-1 pt-2">
				<h1 class="font-ui-head text-3xl tracking-tight text-ink">Papierlabel</h1>
				<p class="text-ink-muted">Hausdesign Kura auf dem Etikettenbogen. Platz antippen, Wort eingeben, PDF drucken. Ein Bogen fasst mehrere Etiketten.</p>
			</div>

			<div class="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
				<div class="flex items-baseline justify-between gap-3">
					<span class="text-sm text-ink-muted">Format</span>
					<span class="font-ui-head text-lg tabular-nums">{format.width} × {format.height} mm</span>
				</div>
				{#if fontError}
					<p class="rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink">Die Schrift konnte nicht geladen werden.</p>
				{/if}
				<div aria-live="polite">
					{#if hints.length > 0}
						<ul class="flex flex-col gap-2" data-testid="hints">
							{#each hints as hint (hint.where + hint.message)}
								<li class="flex gap-2 rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink" data-kind={hint.kind}>
									<span aria-hidden="true" class="font-ui-head text-clay-dark">!</span>{hint.where ? `${hint.where}: ` : ''}{hint.message}
								</li>
							{/each}
						</ul>
					{:else if labels.length === 0}
						<p class="text-sm text-ink-muted" data-testid="empty">Noch kein Etikett auf dem Bogen.</p>
					{:else}
						<p class="text-sm text-ink-muted" data-testid="no-hints">Keine Hinweise.</p>
					{/if}
				</div>
				<button
					type="button"
					class="min-h-12 rounded-xl bg-clay px-5 font-ui-head text-white transition-colors hover:bg-clay-dark disabled:opacity-50"
					disabled={labels.length === 0 || busy}
					onclick={download}
				>
					PDF herunterladen
				</button>
				<p class="-mt-2 truncate text-center text-xs text-ink-muted" data-testid="file-name">{fileName}</p>
			</div>

			<div class="flex flex-col gap-3">
				<ControlGroup title="Bogen" summary={`${format.sheet.name} · ${labels.length} von ${positions.length} belegt`} open>
					<Segmented label="Format (mm)" options={formatOptions} value={formatId} onchange={setFormat} />
					{#if positions.length > 1}
						<div class="flex flex-col gap-2" role="group" aria-label="Platz auf dem Bogen">
							<span class="text-sm text-ink-muted">Platz auf dem Bogen</span>
							<div class="grid gap-1" style="grid-template-columns: repeat({format.sheet.columns}, minmax(0, 1fr))">
								{#each positions as position (position)}
									{@const word = cells[position]?.text.trim()}
									<button
										type="button"
										class="min-h-11 truncate rounded-lg border px-2 text-sm transition-colors
											{position === selected ? 'border-clay bg-clay-soft text-ink' : word ? 'border-line bg-white text-ink hover:border-ink-muted' : 'border-line bg-white text-ink-muted hover:border-ink-muted'}"
										aria-pressed={position === selected}
										onclick={() => (selected = position)}
									>
										{word || 'frei'}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</ControlGroup>

				<ControlGroup title="Etikett" summary={[placeName(selected), current.text.trim() || 'frei'].filter(Boolean).join(' · ')} open>
					<label class="flex flex-col gap-2 text-sm">
						<span class="text-ink-muted">Ein kurzes Wort, Kura schreibt es klein</span>
						<input
							class="min-h-11 rounded-xl border border-line bg-ivory px-3 text-base text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
							value={current.text}
							maxlength="40"
							autocapitalize="none"
							data-testid="text"
							oninput={(e) => edit({ text: textValue(e) })}
						/>
					</label>
					<label class="flex flex-col gap-2 text-sm">
						<span class="text-ink-muted">Unterzeile (optional)</span>
						<input
							class="min-h-11 rounded-xl border border-line bg-ivory px-3 text-base text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
							value={current.subText}
							maxlength="60"
							autocapitalize="none"
							placeholder="z. B. regal 2"
							oninput={(e) => edit({ subText: textValue(e) })}
						/>
					</label>
					{#if positions.length > 1}
						<button type="button" class="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink hover:border-ink-muted disabled:opacity-50" disabled={!cells[selected]} onclick={clear}>
							Platz freigeben
						</button>
					{/if}
				</ControlGroup>
			</div>

			{#if positions.length > 1}
				<button type="button" class="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink hover:border-ink-muted disabled:opacity-50" disabled={labels.length === 0} onclick={clearAll}>
					Bogen leeren
				</button>
			{/if}

			<footer class="px-1 text-xs leading-relaxed text-ink-muted">
				<p>In Originalgröße drucken (100 %, ohne „An Seite anpassen“), sonst stimmen die Plätze auf dem Bogen nicht. Freie Plätze bleiben unbedruckt, der Bogen lässt sich später weiter nutzen.</p>
			</footer>
		</div>
	</main>
</div>
