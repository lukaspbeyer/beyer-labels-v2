<script lang="ts">
	import PaperSheet from '$components/paper/PaperSheet.svelte';
	import WoodTopView from '$components/wood/WoodTopView.svelte';
	import type { ExampleView } from '$lib/media/medium';

	interface Props {
		view: ExampleView;
	}

	let { view }: Props = $props();
</script>

<!--
	Die eine Stelle, die die Beispielansichten der Medien kennt. Übersicht und Werkbank zeigen jedes Beispiel hierüber,
	maßstäblich in der Breite ihres Platzes; die Umgebung (`view.backdrop`) malt der Aufrufer dahinter.
-->
<div class="w-full" data-medium={view.medium}>
	{#if view.medium === 'wood'}
		<WoodTopView layout={view.layout} engraving={view.engraving} surroundings={view.surroundings} sketch={view.sketch} />
	{:else if view.medium === 'paper'}
		<PaperSheet {view} />
	{/if}
</div>
