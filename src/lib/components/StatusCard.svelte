<script lang="ts">
	/** Statuskarte einer Produktseite: Format, Hinweise, Datei. */
	interface Props {
		format: string;
		fontFailed: boolean;
		/** Hinweise in den Worten der Seite */
		hints: readonly { kind: string; text: string }[];
		/** Steht statt „Keine Hinweise.“, solange es nichts zu prüfen gibt; leer: nichts anzeigen */
		idle?: string | null;
		action: string;
		disabled: boolean;
		onaction: () => void;
		fileName: string;
	}

	let { format, fontFailed, hints, idle = null, action, disabled, onaction, fileName }: Props = $props();
</script>

<div class="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
	<div class="flex items-baseline justify-between gap-3">
		<span class="text-sm text-ink-muted">Format</span>
		<span class="font-ui-head text-lg tabular-nums">{format}</span>
	</div>
	{#if fontFailed}
		<p class="rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink">Die Schrift konnte nicht geladen werden.</p>
	{/if}
	<div aria-live="polite">
		{#if hints.length > 0}
			<ul class="flex flex-col gap-2" data-testid="hints">
				{#each hints as hint (hint.text)}
					<li class="flex gap-2 rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink" data-kind={hint.kind}>
						<span aria-hidden="true" class="font-ui-head text-clay-dark">!</span>{hint.text}
					</li>
				{/each}
			</ul>
		{:else if idle}
			<p class="text-sm text-ink-muted" data-testid="empty">{idle}</p>
		{:else if idle === null}
			<p class="text-sm text-ink-muted" data-testid="no-hints">Keine Hinweise.</p>
		{/if}
	</div>
	<button type="button" class="min-h-12 rounded-xl bg-clay px-5 font-ui-head text-white transition-colors hover:bg-clay-dark disabled:opacity-50" {disabled} onclick={onaction}>
		{action}
	</button>
	<p class="-mt-2 truncate text-center text-xs text-ink-muted" data-testid="file-name">{fileName}</p>
</div>
