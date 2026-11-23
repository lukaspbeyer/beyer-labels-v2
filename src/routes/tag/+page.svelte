<script lang="ts">
	import SiteHeader from '$components/SiteHeader.svelte';
	import ControlGroup from '$components/ControlGroup.svelte';
	import StatusCard from '$components/StatusCard.svelte';
	import { KURA } from '$lib/kura/kura';
	import { DAY_SHEET_EXAMPLE, DAY_SHEET_LIMITS, daySheet, parseDaySheet, ROUTINE_BLOCKS, type DaySheetProof } from '$lib/products/daySheet';
	import { daySheetContent, daySheetFields, EMPTY_DAY, fieldLines } from '$lib/products/daySheetForm';
	import { hintText } from '$lib/products/hint';
	import { useFont } from '$lib/typesetting/fontState.svelte';
	import { saveFile } from '$utils/download';

	const L = DAY_SHEET_LIMITS;

	// Der Inhalt lebt nur in dieser Seite
	let form = $state(daySheetFields(DAY_SHEET_EXAMPLE));
	let busy = $state(false);
	const kuraFont = useFont(() => KURA.typeface);

	const parsed = $derived(parseDaySheet(daySheetContent(form)));
	// Bei einem Verstoß der Form bleibt das letzte gesetzte Blatt stehen
	let lastProof: DaySheetProof | null = null;
	const proof = $derived.by(() => {
		if (kuraFont.font && parsed.ok) lastProof = daySheet.set(KURA, { days: [parsed.value] }, kuraFont.font);
		return kuraFont.font ? lastProof : null;
	});
	const hints = $derived(parsed.ok ? (proof?.hints ?? []) : parsed.error);
	const preview = $derived(proof?.days[0].preview ?? '');
	// Ein zu langer Eintrag liefe über den Rand: Hier sperrt jeder Hinweis den Druck, wie bei Agenten
	const printable = $derived(parsed.ok && proof !== null && hints.length === 0);
	const weekday = $derived(parsed.ok ? new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${parsed.value.date}T00:00:00Z`)) : '');

	async function download(): Promise<void> {
		if (!proof || !printable) return;
		busy = true;
		try {
			const file = await proof.file();
			saveFile(file.body, file.fileName, file.mime);
		} finally {
			busy = false;
		}
	}

	const INPUT = 'min-h-11 w-full min-w-0 rounded-xl border border-line bg-ivory px-3 text-base text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/20';
	const count = (value: string) => fieldLines(value).filter((l) => l.trim()).length;
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

			<StatusCard
				format="210 × 297 mm"
				fontFailed={kuraFont.failed}
				hints={hints.map((h) => ({ kind: h.kind, text: hintText(h) }))}
				idle={proof ? null : ''}
				action="PDF herunterladen"
				disabled={!printable || busy}
				onaction={download}
				fileName={parsed.ok ? (proof?.fileName ?? '') : ''}
			/>

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
				<button type="button" class="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink hover:border-ink-muted" onclick={() => (form = daySheetFields({ ...EMPTY_DAY, date: form.date }))}>Blatt leeren</button>
				<button type="button" class="min-h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink hover:border-ink-muted" onclick={() => (form = daySheetFields(DAY_SHEET_EXAMPLE))}>Beispiel</button>
			</div>

			<footer class="px-1 text-xs leading-relaxed text-ink-muted">
				<p>Jeder Eintrag ist eine Zeile; zu lange Einträge werden gemeldet, nicht umbrochen. In Originalgröße drucken (100 %).</p>
			</footer>
		</div>
	</main>
</div>
