<script lang="ts">
	import { applyPreset, woodSettings } from '$stores/wood';
	import { calibration } from '$utils/wood/calibration';
	import { fontInfo } from '$utils/wood/fonts';
	import { matchesPreset, PRESETS, type WoodPreset } from '$utils/wood/presets';

	const settings = $derived($woodSettings);

	/** Farben der Miniatur: Holz je Oberfläche, Schrift je Verfahren. */
	function chipColors(preset: WoodPreset): { wood: string; ink: string; field: string } {
		const s = preset.settings;
		const wood = s.finish === 'limed' ? '#ece6dc' : s.finish === 'raw' ? '#e4c3a2' : '#d9a476';
		const burn = calibration.engraving.burnColor[s.burn];
		if (s.process === 'fill') return { wood, ink: calibration.fill.color[s.fillColor], field: wood };
		if (s.process === 'inverse') return { wood, ink: wood, field: burn };
		return { wood, ink: burn, field: wood };
	}
</script>

<section class="flex flex-col gap-3" aria-label="Vorlagen">
	<div class="flex items-baseline justify-between px-1">
		<h2 class="font-ui-head text-base text-ink">Vorlagen</h2>
		<span class="text-xs text-ink-muted">Japandi, für Agave, Anthrazit und Columba Grey</span>
	</div>
	<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
		{#each PRESETS as preset (preset.id)}
			{@const colors = chipColors(preset)}
			{@const active = matchesPreset(settings, preset)}
			<button
				type="button"
				class="flex min-h-11 flex-col gap-2 rounded-2xl border p-2 text-left transition-colors
					{active ? 'border-clay bg-clay-soft' : 'border-line bg-white hover:border-ink-muted'}"
				aria-pressed={active}
				onclick={() => applyPreset(preset)}
			>
				<span
					class="flex h-14 items-center justify-center rounded-xl"
					style="background: {calibration.front.color[preset.settings.front]}"
					aria-hidden="true"
				>
					<span
						class="flex h-7 items-center px-3 text-xs shadow-sm
							{preset.settings.shape === 'pill' ? 'rounded-full' : preset.settings.cornerRadius > 0 ? 'rounded' : ''}
							{preset.settings.frame ? 'ring-1 ring-inset ring-black/30 ring-offset-0' : ''}"
						style="background: {colors.field}; color: {colors.ink}; outline: 3px solid {colors.wood}; outline-offset: -3px;
							font-family: '{fontInfo(preset.settings.font).cssFamily}'; font-weight: {preset.settings.weight};
							letter-spacing: {preset.settings.tracking / 100}em"
					>
						{preset.settings.uppercase ? 'TELLER' : 'Teller'}
					</span>
				</span>
				<span class="px-1">
					<span class="block font-ui-head text-sm text-ink">{preset.name}</span>
					<span class="block text-xs leading-snug text-ink-muted">{preset.description}</span>
				</span>
			</button>
		{/each}
	</div>
</section>
