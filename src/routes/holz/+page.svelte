<script lang="ts">
	import SiteHeader from '$components/SiteHeader.svelte';
	import StatusCard from '$components/StatusCard.svelte';
	import WoodControls from '$components/wood/WoodControls.svelte';
	import WoodPreview from '$components/wood/WoodPreview.svelte';
	import { KURA } from '$lib/kura/kura';
	import { DEFAULT_WOOD_SURROUNDINGS } from '$lib/media/wood/surroundings';
	import type { WoodSurroundings } from '$lib/media/wood/types';
	import { DEFAULT_WOOD_LABEL_INPUT, woodLabel, type WoodLabelInput, type WoodLabelProof } from '$lib/products/woodLabel';
	import { useFont } from '$lib/typesetting/fontState.svelte';
	import { fontUrl } from '$lib/typesetting/fonts';
	import { saveFile } from '$utils/download';

	// Die Seite hält nur ihre Eingabe: ein Label (Wort, Format) und die Umgebung der Vorschau. Beides beginnt bei jedem Besuch neu.
	let input = $state<WoodLabelInput>({ ...DEFAULT_WOOD_LABEL_INPUT });
	let surroundings = $state<WoodSurroundings>({ ...DEFAULT_WOOD_SURROUNDINGS });

	const kuraFont = useFont(() => KURA.typeface);
	// Bis die Schrift geladen ist, bleibt der letzte Stand stehen; die Vorschau zeigt so lange die Front
	let lastProof: WoodLabelProof | null = null;
	const proof = $derived.by(() => {
		if (kuraFont.font) lastProof = woodLabel.set(KURA, { labels: [{ text: input.text, format: input.format }] }, kuraFont.font);
		return lastProof;
	});
	const label = $derived(proof?.labels[0] ?? null);

	// Ein Mensch an der Seite darf trotz Hinweis laden, etwa für eine Probegravur; für Agenten sperrt jeder Hinweis die Datei
	async function download(): Promise<void> {
		if (!proof) return;
		const file = await proof.file();
		saveFile(file.body, file.fileName, file.mime);
	}
</script>

<svelte:head>
	<title>Holzlabel · Kura</title>
	<meta name="description" content="Türlabels aus Lärche im Hausdesign Kura ansehen und als Laserdatei laden." />
	<link rel="preload" href={fontUrl(KURA.typeface.font, KURA.typeface.weight)} as="font" type="font/woff" crossorigin="anonymous" />
</svelte:head>

<div class="min-h-screen bg-ivory font-ui-body text-ink">
	<SiteHeader />

	<main class="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 pb-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-6">
		<section
			class="sticky top-0 z-20 h-[42vh] min-h-[240px] border-y border-line lg:top-4 lg:h-[calc(100vh-6.5rem)] lg:rounded-3xl lg:border"
			aria-label="Vorschau"
		>
			<div class="h-full w-full overflow-hidden lg:rounded-3xl">
				<WoodPreview {label} {surroundings} />
			</div>
		</section>

		<div class="flex flex-col gap-4 px-4 sm:px-6 lg:px-0">
			<div class="flex flex-col gap-1 pt-2">
				<h1 class="font-ui-head text-3xl tracking-tight text-ink">Holzlabel</h1>
				<p class="text-ink-muted">Hausdesign Kura in Lärche, mit dem CO<sub>2</sub>-Laser graviert. Wort eingeben, ansehen, Laserdatei laden.</p>
			</div>

			<StatusCard
				format={label ? `${label.layout.width} × ${label.layout.height} mm` : '–'}
				fontFailed={kuraFont.failed}
				hints={proof?.hints.map((h) => ({ kind: h.kind, text: h.message })) ?? []}
				idle={label ? null : ''}
				action="SVG herunterladen"
				disabled={!label}
				onaction={download}
				fileName={proof?.fileName ?? ''}
			/>

			<WoodControls bind:input bind:surroundings />

			<footer class="flex flex-col gap-1 px-1 text-xs leading-relaxed text-ink-muted">
				<p>
					Ebenen der SVG: schwarz = Gravur (Fläche), blau = Rahmen (Linie), rot = Schnitt (Kontur). Befestigung mit
					doppelseitigem Klebeband.
				</p>
				<p>Holzfoto: „Larch Wood“ von Christine und Hagen Graf, bearbeitet.</p>
				<a class="inline-flex min-h-11 items-center self-start underline" href="https://creativecommons.org/licenses/by/2.0/"
					>Lizenz CC BY 2.0</a
				>
			</footer>
		</div>
	</main>
</div>
