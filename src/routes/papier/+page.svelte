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
		paperLabelPage,
		positionCount,
		type PaperLabelFormatId,
		type PaperLabelInput
	} from '$lib/products/paperLabel';
	import { createFontLoader, type LoadedFont } from '$lib/typesetting/fonts';

	let input = $state<PaperLabelInput>({ ...DEFAULT_PAPER_LABEL_INPUT });
	// Schriftobjekte nicht reaktiv verpacken; nur der Austausch zählt
	let font = $state.raw<LoadedFont | null>(null);
	let fontError = $state(false);
	let busy = $state(false);

	const format = $derived(PAPER_LABEL_FORMATS[input.format]);
	const layout = $derived(font ? layoutPaperLabel(KURA, input, font) : null);
	const hints = $derived(layout ? checkPaperLabel(KURA, layout) : []);
	const sheet = $derived(layout ? paperLabelPage(layout, input.position) : null);
	const preview = $derived(sheet ? pageSvg(sheet, KURA.paper.ink) : '');
	const positions = $derived(Array.from({ length: positionCount(input.format) }, (_, i) => i));
	const fileName = $derived(paperLabelFileName(input));

	const FORMAT_IDS: readonly PaperLabelFormatId[] = ['small', 'large'];
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

	function textValue(event: Event): string {
		const target = event.currentTarget;
		return target instanceof HTMLInputElement ? target.value : '';
	}

	function setFormat(next: PaperLabelFormatId): void {
		input = { ...input, format: next, position: 0 };
	}

	async function download(): Promise<void> {
		if (!sheet) return;
		busy = true;
		try {
			// Die PDF-Bibliothek erst laden, wenn gedruckt wird
			const { renderPdf } = await import('$lib/media/paper/pdf');
			const bytes = await renderPdf([sheet], KURA.paper.ink, input.text.trim());
			const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: 'application/pdf' }));
			const link = document.createElement('a');
			link.href = url;
			link.download = fileName;
			document.body.appendChild(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
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
				<div
					class="absolute left-0 top-0 grid"
					style="width: {(format.width * format.sheet.columns * 100) / format.sheet.width}%; height: {(format.height * format.sheet.rows * 100) /
						format.sheet.height}%; grid-template-columns: repeat({format.sheet.columns}, 1fr); grid-template-rows: repeat({format.sheet.rows}, 1fr);"
					aria-hidden="true"
				>
					{#each positions as position (position)}
						<div class="border border-dashed border-line"></div>
					{/each}
				</div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- eigenes SVG aus Pfaden, kein fremder Text -->
				<div class="absolute inset-0 [&>svg]:h-full [&>svg]:w-full">{@html preview}</div>
			</div>
		</section>

		<div class="flex flex-col gap-4 px-4 sm:px-6 lg:px-0">
			<div class="flex flex-col gap-1 pt-2">
				<h1 class="font-ui-head text-3xl tracking-tight text-ink">Papierlabel</h1>
				<p class="text-ink-muted">Hausdesign Kura auf dem Etikettenbogen. Wort eingeben, Platz wählen, PDF drucken.</p>
			</div>

			<div class="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
				<div class="flex items-baseline justify-between gap-3">
					<span class="text-sm text-ink-muted">Bogen</span>
					<span class="font-ui-head text-lg tabular-nums">{format.sheet.name} · {format.width} × {format.height} mm</span>
				</div>
				{#if fontError}
					<p class="rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink">Die Schrift konnte nicht geladen werden.</p>
				{/if}
				<div aria-live="polite">
					{#if hints.length > 0}
						<ul class="flex flex-col gap-2" data-testid="hints">
							{#each hints as hint (hint.message)}
								<li class="flex gap-2 rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink" data-kind={hint.kind}>
									<span aria-hidden="true" class="font-ui-head text-clay-dark">!</span>{hint.message}
								</li>
							{/each}
						</ul>
					{:else if layout}
						<p class="text-sm text-ink-muted" data-testid="no-hints">Keine Hinweise.</p>
					{/if}
				</div>
				<button
					type="button"
					class="min-h-12 rounded-xl bg-clay px-5 font-ui-head text-white transition-colors hover:bg-clay-dark disabled:opacity-50"
					disabled={!sheet || busy}
					onclick={download}
				>
					PDF herunterladen
				</button>
				<p class="-mt-2 truncate text-center text-xs text-ink-muted">{fileName}</p>
			</div>

			<div class="flex flex-col gap-3">
				<ControlGroup title="Text" summary={input.subText ? `${input.text} / ${input.subText}` : input.text} open>
					<label class="flex flex-col gap-2 text-sm">
						<span class="text-ink-muted">Ein kurzes Wort, Kura schreibt es klein</span>
						<input
							class="min-h-11 rounded-xl border border-line bg-ivory px-3 text-base text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
							value={input.text}
							maxlength="40"
							autocapitalize="none"
							oninput={(e) => (input = { ...input, text: textValue(e) })}
						/>
					</label>
					<label class="flex flex-col gap-2 text-sm">
						<span class="text-ink-muted">Unterzeile (optional)</span>
						<input
							class="min-h-11 rounded-xl border border-line bg-ivory px-3 text-base text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
							value={input.subText}
							maxlength="60"
							autocapitalize="none"
							placeholder="z. B. regal 2"
							oninput={(e) => (input = { ...input, subText: textValue(e) })}
						/>
					</label>
				</ControlGroup>

				<ControlGroup title="Bogen" summary={`Platz ${input.position + 1}`} open>
					<Segmented label="Format (mm)" options={formatOptions} value={input.format} onchange={setFormat} />
					{#if positions.length > 1}
						<div class="flex flex-col gap-2" role="group" aria-label="Platz auf dem Bogen">
							<span class="text-sm text-ink-muted">Platz auf dem Bogen</span>
							<div class="grid w-40 gap-1" style="grid-template-columns: repeat({format.sheet.columns}, 1fr)">
								{#each positions as position (position)}
									<button
										type="button"
										class="min-h-11 rounded-lg border text-sm transition-colors
											{position === input.position ? 'border-clay bg-clay-soft text-ink' : 'border-line bg-white text-ink-muted hover:border-ink-muted'}"
										aria-pressed={position === input.position}
										onclick={() => (input = { ...input, position })}
									>
										{position + 1}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</ControlGroup>
			</div>

			<footer class="px-1 text-xs leading-relaxed text-ink-muted">
				<p>In Originalgröße drucken (100 %, ohne „An Seite anpassen“), sonst stimmen die Plätze auf dem Bogen nicht.</p>
			</footer>
		</div>
	</main>
</div>
