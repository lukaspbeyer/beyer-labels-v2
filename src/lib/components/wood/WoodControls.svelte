<script lang="ts">
	import { WOOD_LABEL_FORMATS, type WoodLabelFormatId } from '$lib/products/woodLabel';
	import { updateWoodLabel, woodLabelInput } from '$stores/wood';
	import { calibration } from '$utils/wood/calibration';
	import type { FrontColor } from '$utils/wood/types';
	import ControlGroup from './ControlGroup.svelte';
	import Segmented from './Segmented.svelte';
	import Slider from './Slider.svelte';

	const input = $derived($woodLabelInput);

	const FRONT_LABEL = { agave: 'Agave', anthracite: 'Anthrazit', columba: 'Columba Grey' } as const;
	const FRONTS: readonly FrontColor[] = ['agave', 'anthracite', 'columba'];
	const FORMAT_IDS: readonly WoodLabelFormatId[] = ['standard', 'long'];
	const formatOptions = FORMAT_IDS.map((value) => {
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
			<span class="text-ink-muted">Ein kurzes Wort, Kura schreibt es klein</span>
			<input
				class="min-h-11 rounded-xl border border-line bg-ivory px-3 text-base text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
				value={input.text}
				maxlength="40"
				autocapitalize="none"
				oninput={(e) => updateWoodLabel({ text: textValue(e) })}
			/>
		</label>
		<Segmented label="Format (mm)" options={formatOptions} value={input.format} onchange={(format) => updateWoodLabel({ format })} />
	</ControlGroup>

	<ControlGroup title="Vorschau" summary={FRONT_LABEL[input.front]}>
		<div class="flex flex-col gap-2" role="group" aria-label="Möbelfront">
			<span class="text-sm text-ink-muted">Möbelfront</span>
			<div class="grid grid-cols-3 gap-2">
				{#each FRONTS as front (front)}
					<button
						type="button"
						class="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-xs transition-colors
							{front === input.front ? 'border-clay bg-clay-soft text-ink' : 'border-line bg-white text-ink-muted hover:border-ink-muted'}"
						aria-pressed={front === input.front}
						onclick={() => updateWoodLabel({ front })}
					>
						<span class="h-6 w-6 rounded-full ring-1 ring-black/10" style="background: {calibration.front.color[front]}"></span>
						{FRONT_LABEL[front]}
					</button>
				{/each}
			</div>
		</div>
		<button
			type="button"
			class="min-h-11 rounded-xl border border-line bg-white px-4 text-sm text-ink hover:border-ink-muted"
			onclick={() => updateWoodLabel({ grainSeed: input.grainSeed + 1 })}
		>
			Anderer Holzausschnitt
		</button>
		<Segmented
			label="Ansicht"
			options={[
				{ value: 'front', label: 'Frontal' },
				{ value: 'oblique', label: 'Schräg' }
			]}
			value={input.view}
			onchange={(view) => updateWoodLabel({ view })}
		/>
		<Slider label="Lichtrichtung" unit="°" min={0} max={359} step={1} value={input.lightAngle} onchange={(lightAngle) => updateWoodLabel({ lightAngle })} />
	</ControlGroup>
</div>
