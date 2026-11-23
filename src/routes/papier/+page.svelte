<script lang="ts">
	import SiteHeader from '$components/SiteHeader.svelte';
	import ControlGroup from '$components/ControlGroup.svelte';
	import Segmented from '$components/Segmented.svelte';
	import StatusCard from '$components/StatusCard.svelte';
	import { caseInWords, KURA } from '$lib/kura/kura';
	import { DEFAULT_PAPER_LABEL_INPUT, PAPER_LABEL_FORMAT_IDS, PAPER_LABEL_FORMATS, paperLabel, placeOf, positionCount, type PaperLabelFormatId } from '$lib/products/paperLabel';
	import { useFont } from '$lib/typesetting/fontState.svelte';
	import { saveFile } from '$utils/download';

	interface Cell {
		text: string;
		subText: string;
	}

	let formatId = $state<PaperLabelFormatId>(DEFAULT_PAPER_LABEL_INPUT.format);
	// Je Platz auf dem Bogen ein Etikett; ein Platz ohne Wort bleibt frei. Der Inhalt lebt nur in dieser Seite.
	let cells = $state<Record<number, Cell>>({ 0: { text: DEFAULT_PAPER_LABEL_INPUT.text, subText: '' } });
	let selected = $state(0);
	let busy = $state(false);
	const kuraFont = useFont(() => KURA.typeface);

	const format = $derived(PAPER_LABEL_FORMATS[formatId]);
	const positions = $derived(Array.from({ length: positionCount(formatId) }, (_, i) => i));
	const current = $derived(cells[selected] ?? { text: '', subText: '' });
	const filled = $derived(positions.filter((position) => cells[position]?.text.trim()).map((position) => ({ ...cells[position], position })));
	const proof = $derived(kuraFont.font ? paperLabel.set(KURA, { format: formatId, labels: filled }, kuraFont.font) : null);
	const count = $derived(proof?.labels.length ?? 0);
	// Die Seite nennt den Platz des Etiketts statt seiner Stelle im Inhalt
	const hints = $derived(
		proof?.labels.flatMap((label) => label.hints.map((h) => ({ kind: h.kind, text: [placeName(label.position), h.message].filter(Boolean).join(': ') }))) ?? []
	);
	const preview = $derived(proof?.preview ?? '');

	const formatOptions = PAPER_LABEL_FORMAT_IDS.map((value) => {
		const f = PAPER_LABEL_FORMATS[value];
		return { value, label: `${f.name} ${f.width} × ${f.height}` };
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

	// Ein Mensch an der Seite darf trotz Hinweis drucken; für Agenten sperrt jeder Hinweis die Datei
	async function download(): Promise<void> {
		if (!proof || count === 0) return;
		busy = true;
		try {
			const file = await proof.file();
			saveFile(file.body, file.fileName, file.mime);
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

			<StatusCard
				format={`${format.width} × ${format.height} mm`}
				fontFailed={kuraFont.failed}
				{hints}
				idle={count === 0 ? 'Noch kein Etikett auf dem Bogen.' : null}
				action="PDF herunterladen"
				disabled={count === 0 || busy}
				onaction={download}
				fileName={proof?.fileName ?? ''}
			/>

			<div class="flex flex-col gap-3">
				<ControlGroup title="Bogen" summary={`${format.sheet.name} · ${count} von ${positions.length} belegt`} open>
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
						<span class="text-ink-muted">Ein kurzes Wort, Kura schreibt es {caseInWords(KURA.sign.case)}</span>
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
				<button type="button" class="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink hover:border-ink-muted disabled:opacity-50" disabled={count === 0} onclick={clearAll}>
					Bogen leeren
				</button>
			{/if}

			<footer class="px-1 text-xs leading-relaxed text-ink-muted">
				<p>In Originalgröße drucken (100 %, ohne „An Seite anpassen“), sonst stimmen die Plätze auf dem Bogen nicht. Freie Plätze bleiben unbedruckt, der Bogen lässt sich später weiter nutzen.</p>
			</footer>
		</div>
	</main>
</div>
