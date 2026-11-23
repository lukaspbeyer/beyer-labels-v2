<script lang="ts">
	import { caseInWords, KURA } from '$lib/kura/kura';
	import { WOOD_LABEL_FORMAT_IDS, WOOD_LABEL_FORMATS, type WoodLabelInput } from '$lib/products/woodLabel';
	import { FRONT_COLORS, FRONT_NAMES, frontColor } from '$lib/media/wood/surroundings';
	import type { WoodSurroundings } from '$lib/media/wood/types';
	import ControlGroup from '$components/ControlGroup.svelte';
	import Segmented from '$components/Segmented.svelte';
	import Slider from '$components/Slider.svelte';

	interface Props {
		/** Wort und Format des Labels */
		input: WoodLabelInput;
		/** Umgebung der Vorschau: Front, Blickwinkel, Licht, Holzausschnitt */
		surroundings: WoodSurroundings;
	}

	let { input = $bindable(), surroundings = $bindable() }: Props = $props();

	function setInput(changes: Partial<WoodLabelInput>): void {
		input = { ...input, ...changes };
	}

	function setSurroundings(changes: Partial<WoodSurroundings>): void {
		surroundings = { ...surroundings, ...changes };
	}
	const formatOptions = WOOD_LABEL_FORMAT_IDS.map((value) => {
		const format = WOOD_LABEL_FORMATS[value];
		return { value, label: `${format.name} ${format.width} × ${format.height}` };
	});

	function textValue(event: Event): string {
		const target = event.currentTarget;
		return target instanceof HTMLInputElement ? target.value : '';
	}
</script>

<div class="flex flex-col gap-3">
	<ControlGroup title="Wort" summary={input.text} open>
		<label class="flex flex-col gap-2 text-sm">
			<span class="text-ink-muted">Ein kurzes Wort, Kura schreibt es {caseInWords(KURA.sign.case)}</span>
			<input
				class="min-h-11 rounded-xl border border-line bg-ivory px-3 text-base text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
				value={input.text}
				maxlength="40"
				autocapitalize="none"
				oninput={(e) => setInput({ text: textValue(e) })}
			/>
		</label>
		<Segmented label="Format (mm)" options={formatOptions} value={input.format} onchange={(format) => setInput({ format })} />
	</ControlGroup>

	<ControlGroup title="Vorschau" summary={FRONT_NAMES[surroundings.front]}>
		<div class="flex flex-col gap-2" role="group" aria-label="Möbelfront">
			<span class="text-sm text-ink-muted">Möbelfront</span>
			<div class="grid grid-cols-3 gap-2">
				{#each FRONT_COLORS as front (front)}
					<button
						type="button"
						class="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-xs transition-colors
							{front === surroundings.front ? 'border-clay bg-clay-soft text-ink' : 'border-line bg-white text-ink-muted hover:border-ink-muted'}"
						aria-pressed={front === surroundings.front}
						onclick={() => setSurroundings({ front })}
					>
						<span class="h-6 w-6 rounded-full ring-1 ring-black/10" style="background: {frontColor(front)}"></span>
						{FRONT_NAMES[front]}
					</button>
				{/each}
			</div>
		</div>
		<button
			type="button"
			class="min-h-11 rounded-xl border border-line bg-white px-4 text-sm text-ink hover:border-ink-muted"
			onclick={() => setSurroundings({ grainSeed: surroundings.grainSeed + 1 })}
		>
			Anderer Holzausschnitt
		</button>
		<Segmented
			label="Ansicht"
			options={[
				{ value: 'front', label: 'Frontal' },
				{ value: 'oblique', label: 'Schräg' }
			]}
			value={surroundings.view}
			onchange={(view) => setSurroundings({ view })}
		/>
		<Slider label="Lichtrichtung" unit="°" min={0} max={359} step={1} value={surroundings.lightAngle} onchange={(lightAngle) => setSurroundings({ lightAngle })} />
	</ControlGroup>
</div>
