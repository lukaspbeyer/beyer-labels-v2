<script lang="ts">
	import type { PaperExampleView } from '$lib/media/paper/medium';

	interface Props {
		view: PaperExampleView;
	}

	let { view }: Props = $props();
</script>

<!-- Ein Blatt: weiß mit feiner Kante, maßstäblich; die Kante zeigt nur die Ansicht, gedruckt wird sie nicht -->
<div class="relative bg-white ring-1 ring-line" style="aspect-ratio: {view.width} / {view.height}" data-mode="sheet">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- eigenes SVG aus Pfaden, kein fremder Text -->
	<div class="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full">{@html view.svg}</div>
</div>
