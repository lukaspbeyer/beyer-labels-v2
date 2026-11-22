<script lang="ts">
	import SiteHeader from '$components/SiteHeader.svelte';
	import ControlGroup from '$components/ControlGroup.svelte';
	import { KURA } from '$lib/kura/kura';
	import { pageSvg, type PrintPage } from '$lib/media/paper/page';
	import { DAY_SHEET_EXAMPLE, DAY_SHEET_LIMITS, daySheetFileName, layoutDaySheet, parseDaySheet, ROUTINE_BLOCKS, type DaySheetInput } from '$lib/products/daySheet';
	import type { Hint } from '$lib/products/hint';
	import { createFontLoader, type LoadedFont } from '$lib/typesetting/fonts';
	import { saveFile } from '$utils/download';

	const L = DAY_SHEET_LIMITS;

	/** Der Inhalt, wie ihn die Felder halten: Listen als Zeilen, Zahlen als Text. Er lebt nur in dieser Seite. */
	function fields(day: DaySheetInput) {
		return {
			date: day.date,
			focus: { ...day.focus },
			routines: { morning: day.routines.morning.join('\n'), midday: day.routines.midday.join('\n'), evening: day.routines.evening.join('\n') },
			tasks: Array.from({ length: L.tasks }, (_, i) => ({ text: day.tasks[i]?.text ?? '', minutes: day.tasks[i]?.minutes?.toString() ?? '' })),
			appointments: Array.from({ length: L.appointments }, (_, i) => ({
				time: day.appointments[i]?.time ?? '',
				text: day.appointments[i]?.text ?? '',
				leaveAt: day.appointments[i]?.leaveAt ?? ''
			})),
			remember: day.remember.join('\n')
		};
	}

	const EMPTY: DaySheetInput = { date: DAY_SHEET_EXAMPLE.date, focus: { text: '', firstStep: '' }, routines: { morning: [], midday: [], evening: [] }, tasks: [], appointments: [], remember: [] };

	let form = $state(fields(DAY_SHEET_EXAMPLE));
	// Schriftobjekte nicht reaktiv verpacken; nur der Austausch zählt
	let font = $state.raw<LoadedFont | null>(null);
	let fontError = $state(false);
	let busy = $state(false);

	const lines = (value: string) => value.split('\n');
	// Derselbe Inhalt, den ein Agent senden würde, und dieselbe Prüfung
	const content = $derived({
		date: form.date,
		focus: form.focus,
		routines: { morning: lines(form.routines.morning), midday: lines(form.routines.midday), evening: lines(form.routines.evening) },
		tasks: form.tasks.map((t) => ({ text: t.text, minutes: Number(t.minutes) || undefined })),
		appointments: form.appointments.filter((a) => a.time || a.text),
		remember: lines(form.remember)
	});
	const parsed = $derived(parseDaySheet(content));
	// Bei einem Verstoß bleibt das letzte gültige Blatt stehen
	let lastSheet: PrintPage | null = null;
	const result = $derived.by((): { sheet: PrintPage | null; hints: Hint[]; day: DaySheetInput | null } => {
		if (!font) return { sheet: null, hints: [], day: null };
		if (!parsed.ok) return { sheet: lastSheet, hints: parsed.error, day: null };
		const { page, hints } = layoutDaySheet(KURA, parsed.value, font);
		lastSheet = page;
		return { sheet: page, hints, day: parsed.value };
	});
	const preview = $derived(result.sheet ? pageSvg(result.sheet, KURA.paper.ink) : '');
	const printable = $derived(result.day !== null && result.hints.length === 0);
	const fileName = $derived(result.day ? daySheetFileName(result.day) : '');
	const weekday = $derived(result.day ? new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${result.day.date}T00:00:00Z`)) : '');

	$effect(() => {
		createFontLoader(fetch)
			.load(KURA.typeface.font, KURA.typeface.weight)
			.then((loaded) => {
				fontError = !loaded.ok;
				if (loaded.ok) font = loaded.value;
			});
	});

	async function download(): Promise<void> {
		if (!result.sheet || !printable) return;
		busy = true;
		try {
			// Die PDF-Bibliothek erst laden, wenn gedruckt wird
			const { renderPdf } = await import('$lib/media/paper/pdf');
			saveFile(await renderPdf([result.sheet], KURA.paper.ink, 'Tagesübersicht'), fileName, 'application/pdf');
		} finally {
			busy = false;
		}
	}

	const INPUT = 'min-h-11 w-full min-w-0 rounded-xl border border-line bg-ivory px-3 text-base text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/20';
	const count = (value: string) => lines(value).filter((l) => l.trim()).length;
</script>

<svelte:head>
	<title>Tagesübersicht · Kura</title>
	<meta name="description" content="Die Tagesübersicht im Hausdesign Kura ansehen, mit eigenem Inhalt ausprobieren und als PDF drucken." />
</svelte:head>

<div class="min-h-screen bg-ivory font-ui-body text-ink">
	<SiteHeader />

	<main class="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 pb-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-6">
		<section
			class="sticky top-0 z-20 flex h-[42vh] min-h-[240px] items-center justify-center border-y border-line bg-sand p-4 lg:top-4 lg:h-[calc(100vh-6.5rem)] lg:rounded-3xl lg:border lg:p-8"
			aria-label="Vorschau"
		>
			<div class="relative max-h-full max-w-full bg-white ring-1 ring-line transition-opacity {printable ? '' : 'opacity-60'}" style="aspect-ratio: 210 / 297; height: 100%;" data-testid="sheet">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- eigenes SVG aus Pfaden, kein fremder Text -->
				<div class="absolute inset-0 [&>svg]:h-full [&>svg]:w-full">{@html preview}</div>
			</div>
		</section>

		<div class="flex flex-col gap-4 px-4 sm:px-6 lg:px-0">
			<div class="flex flex-col gap-1 pt-2">
				<h1 class="font-ui-head text-3xl tracking-tight text-ink">Tagesübersicht</h1>
				<p class="text-ink-muted">Ein Blatt A4 für einen Tag. Sonst füllt es ein Agent; hier lässt es sich mit eigenem Inhalt ausprobieren und drucken. Gespeichert wird nichts.</p>
			</div>

			<div class="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
				<div class="flex items-baseline justify-between gap-3">
					<span class="text-sm text-ink-muted">Format</span>
					<span class="font-ui-head text-lg tabular-nums">210 × 297 mm</span>
				</div>
				{#if fontError}
					<p class="rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink">Die Schrift konnte nicht geladen werden.</p>
				{/if}
				<div aria-live="polite">
					{#if result.hints.length > 0}
						<ul class="flex flex-col gap-2" data-testid="hints">
							{#each result.hints as hint (hint.message)}
								<li class="flex gap-2 rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink" data-kind={hint.kind}>
									<span aria-hidden="true" class="font-ui-head text-clay-dark">!</span>{hint.message}
								</li>
							{/each}
						</ul>
					{:else if result.sheet}
						<p class="text-sm text-ink-muted" data-testid="no-hints">Keine Hinweise.</p>
					{/if}
				</div>
				<button
					type="button"
					class="min-h-12 rounded-xl bg-clay px-5 font-ui-head text-white transition-colors hover:bg-clay-dark disabled:opacity-50"
					disabled={!printable || busy}
					onclick={download}
				>
					PDF herunterladen
				</button>
				<p class="-mt-2 truncate text-center text-xs text-ink-muted" data-testid="file-name">{fileName}</p>
			</div>

			<div class="flex flex-col gap-3">
				<ControlGroup title="Heute wichtig" summary={weekday} open>
					<label class="flex flex-col gap-2 text-sm">
						<span class="text-ink-muted">Tag</span>
						<input type="date" class={INPUT} bind:value={form.date} data-testid="date" />
					</label>
					<label class="flex flex-col gap-2 text-sm">
						<span class="text-ink-muted">Genau eine Sache</span>
						<input class={INPUT} bind:value={form.focus.text} maxlength="80" data-testid="focus" />
					</label>
					<label class="flex flex-col gap-2 text-sm">
						<span class="text-ink-muted">Erster Schritt: die kleinste konkrete Handlung</span>
						<input class={INPUT} bind:value={form.focus.firstStep} maxlength="80" />
					</label>
				</ControlGroup>

				<ControlGroup title="Routinen" summary={ROUTINE_BLOCKS.map(({ id }) => count(form.routines[id])).join(' · ')}>
					{#each ROUTINE_BLOCKS as block (block.id)}
						<label class="flex flex-col gap-2 text-sm">
							<span class="text-ink-muted">{block.name}: eine Routine je Zeile, höchstens {L.routinesPerBlock}</span>
							<textarea class="{INPUT} py-2 leading-relaxed" rows={L.routinesPerBlock} bind:value={form.routines[block.id]} data-testid="routines-{block.id}"></textarea>
						</label>
					{/each}
				</ControlGroup>

				<ControlGroup title="Außerdem" summary={`${form.tasks.filter((t) => t.text.trim()).length} von ${L.tasks}`}>
					{#each form.tasks as task, i (i)}
						<div class="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
							<input class={INPUT} bind:value={task.text} maxlength="80" placeholder="Aufgabe {i + 1}" aria-label="Aufgabe {i + 1}" />
							<input class={INPUT} bind:value={task.minutes} inputmode="numeric" maxlength="3" placeholder="min" aria-label="Dauer der Aufgabe {i + 1} in Minuten" />
						</div>
					{/each}
				</ControlGroup>

				<ControlGroup title="Termine" summary={`${form.appointments.filter((a) => a.time || a.text.trim()).length} von ${L.appointments}`}>
					{#each form.appointments as appointment, i (i)}
						<div class="flex flex-col gap-2 border-b border-line pb-4 last:border-0 last:pb-0">
							<input class={INPUT} bind:value={appointment.text} maxlength="80" placeholder="Termin {i + 1}" aria-label="Termin {i + 1}" />
							<div class="grid grid-cols-2 gap-2">
								<label class="flex flex-col gap-1 text-xs text-ink-muted">
									Uhrzeit
									<input type="time" class={INPUT} bind:value={appointment.time} />
								</label>
								<label class="flex flex-col gap-1 text-xs text-ink-muted">
									Losgehen um
									<input type="time" class={INPUT} bind:value={appointment.leaveAt} />
								</label>
							</div>
						</div>
					{/each}
				</ControlGroup>

				<ControlGroup title="Mitnehmen" summary={`${count(form.remember)} von ${L.remember}`}>
					<label class="flex flex-col gap-2 text-sm">
						<span class="text-ink-muted">Ein Ding je Zeile, höchstens {L.remember}</span>
						<textarea class="{INPUT} py-2 leading-relaxed" rows={L.remember} bind:value={form.remember}></textarea>
					</label>
				</ControlGroup>
			</div>

			<div class="grid grid-cols-2 gap-2">
				<button type="button" class="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink hover:border-ink-muted" onclick={() => (form = fields({ ...EMPTY, date: form.date }))}>Blatt leeren</button>
				<button type="button" class="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink hover:border-ink-muted" onclick={() => (form = fields(DAY_SHEET_EXAMPLE))}>Beispiel</button>
			</div>

			<footer class="px-1 text-xs leading-relaxed text-ink-muted">
				<p>Jeder Eintrag ist eine Zeile; zu lange Einträge werden gemeldet, nicht umbrochen. In Originalgröße drucken (100 %).</p>
			</footer>
		</div>
	</main>
</div>
