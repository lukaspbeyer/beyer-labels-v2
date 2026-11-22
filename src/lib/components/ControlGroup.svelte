<script lang="ts">
	import { untrack, type Snippet } from 'svelte';

	interface Props {
		title: string;
		summary?: string;
		open?: boolean;
		children: Snippet;
	}

	let { title, summary = '', open = false, children }: Props = $props();
	// Nur Anfangszustand; danach gehört er dem Element, damit andere Änderungen ihn nicht zurücksetzen
	let expanded = $state(untrack(() => open));
</script>

<details class="group rounded-2xl border border-line bg-white" bind:open={expanded}>
	<summary
		class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden"
	>
		<span class="shrink-0 font-ui-head text-base text-ink">{title}</span>
		<span class="flex min-w-0 items-center gap-3 text-sm text-ink-muted">
			<span class="truncate">{summary}</span>
			<svg class="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 16 16" aria-hidden="true">
				<path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" />
			</svg>
		</span>
	</summary>
	<div class="flex flex-col gap-5 border-t border-line px-5 pt-4 pb-5">
		{@render children()}
	</div>
</details>
