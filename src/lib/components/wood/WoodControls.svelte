<script lang="ts">
	import { updateWood, woodSettings } from '$stores/wood';
	import { calibration } from '$utils/wood/calibration';
	import { FONT_CATALOG, fontInfo, nearestWeight } from '$utils/wood/fonts';
	import type { FontWeight, FrontColor } from '$utils/wood/types';
	import ControlGroup from './ControlGroup.svelte';
	import Segmented from './Segmented.svelte';
	import Slider from './Slider.svelte';

	const s = $derived($woodSettings);
	const limits = calibration.layout;

	const PROCESS_LABEL = { dark: 'Dunkle Gravur', inverse: 'Inverse Gravur', fill: 'Farbfüllung' } as const;
	const FINISH_LABEL = { raw: 'roh', oiled: 'geölt', lacquer: 'Lack matt', limed: 'weiß gekalkt' } as const;
	const SHAPE_LABEL = { rectangle: 'Rechteck', pill: 'Pille', oval: 'Oval' } as const;
	const FRONT_LABEL = { agave: 'Agave', anthracite: 'Anthrazit', columba: 'Columba Grey' } as const;
	const FRONTS: readonly FrontColor[] = ['agave', 'anthracite', 'columba'];
	const WEIGHT_LABEL: Record<FontWeight, string> = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
	const weightOptions = $derived(fontInfo(s.font).weights.map((value) => ({ value, label: WEIGHT_LABEL[value] })));

	function textValue(event: Event): string {
		const target = event.currentTarget;
		return target instanceof HTMLInputElement ? target.value : '';
	}
</script>

<div class="flex flex-col gap-3">
	<ControlGroup title="Text" summary={s.subText ? `${s.text} / ${s.subText}` : s.text} open>
		<label class="flex flex-col gap-2 text-sm">
			<span class="text-ink-muted">Hauptzeile</span>
			<input
				class="min-h-11 rounded-xl border border-line bg-ivory px-3 text-base text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
				value={s.text}
				maxlength="40"
				oninput={(e) => updateWood({ text: textValue(e) })}
			/>
		</label>
		<label class="flex flex-col gap-2 text-sm">
			<span class="text-ink-muted">Unterzeile (optional)</span>
			<input
				class="min-h-11 rounded-xl border border-line bg-ivory px-3 text-base text-ink outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
				value={s.subText}
				maxlength="60"
				placeholder="z. B. Assiettes"
				oninput={(e) => updateWood({ subText: textValue(e) })}
			/>
		</label>
		<Segmented
			label="Schreibweise"
			options={[
				{ value: true, label: 'VERSALIEN' },
				{ value: false, label: 'Wie eingegeben' }
			]}
			value={s.uppercase}
			onchange={(uppercase) => updateWood({ uppercase })}
		/>
	</ControlGroup>

	<ControlGroup title="Schrift" summary={`${fontInfo(s.font).name} · ${s.capHeight.toFixed(1).replace('.', ',')} mm`}>
		<div class="flex flex-col gap-2" role="group" aria-label="Schriftart">
			<span class="text-sm text-ink-muted">Schriftart</span>
			<div class="grid grid-cols-2 gap-2">
				{#each FONT_CATALOG as font (font.id)}
					<button
						type="button"
						class="flex min-h-14 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors
							{font.id === s.font ? 'border-clay bg-clay-soft' : 'border-line bg-white hover:border-ink-muted'}"
						aria-pressed={font.id === s.font}
						onclick={() => updateWood({ font: font.id, weight: nearestWeight(font.id, s.weight) })}
					>
						<span class="text-lg leading-tight text-ink" style="font-family: '{font.cssFamily}'; font-weight: {nearestWeight(font.id, s.weight)}"
							>{s.uppercase ? 'TELLER' : 'Teller'}</span
						>
						<span class="text-xs text-ink-muted">{font.name}</span>
					</button>
				{/each}
			</div>
		</div>
		<Segmented label="Gewicht" options={weightOptions} value={s.weight} onchange={(weight) => updateWood({ weight })} />
		<Slider label="Versalhöhe" unit="mm" min={2} max={30} step={0.5} decimals={1} value={s.capHeight} onchange={(capHeight) => updateWood({ capHeight })} />
		<Slider label="Laufweite" unit="%" min={0} max={40} step={1} value={s.tracking} onchange={(tracking) => updateWood({ tracking })} />
		<Slider
			label="Zeilenabstand"
			unit="× Versalhöhe"
			min={0.3}
			max={1.5}
			step={0.05}
			decimals={2}
			value={s.lineSpacing}
			disabled={!s.subText.trim()}
			onchange={(lineSpacing) => updateWood({ lineSpacing })}
		/>
		<Segmented
			label="Ausrichtung"
			options={[
				{ value: 'left', label: 'Links' },
				{ value: 'center', label: 'Mittig' },
				{ value: 'right', label: 'Rechts' }
			]}
			value={s.align}
			onchange={(align) => updateWood({ align })}
		/>
	</ControlGroup>

	<ControlGroup title="Holz & Oberfläche" summary={`Lärche · ${FINISH_LABEL[s.finish]}`}>
		<p class="text-sm text-ink-muted">Lärche, {calibration.label.thicknessMm} mm, lasergeschnittene Kante.</p>
		<Segmented
			label="Maserung"
			options={[
				{ value: 'horizontal', label: 'Waagerecht' },
				{ value: 'vertical', label: 'Senkrecht' }
			]}
			value={s.grain}
			onchange={(grain) => updateWood({ grain })}
		/>
		<button
			type="button"
			class="min-h-11 rounded-xl border border-line bg-white px-4 text-sm text-ink hover:border-ink-muted"
			onclick={() => updateWood({ grainSeed: s.grainSeed + 1 })}
		>
			Andere Maserung
		</button>
		<Segmented
			label="Oberfläche"
			options={[
				{ value: 'raw', label: 'Roh' },
				{ value: 'oiled', label: 'Geölt' },
				{ value: 'lacquer', label: 'Lack matt' },
				{ value: 'limed', label: 'Weiß gekalkt' }
			]}
			value={s.finish}
			onchange={(finish) => updateWood({ finish })}
		/>
	</ControlGroup>

	<ControlGroup title="Verfahren" summary={PROCESS_LABEL[s.process]}>
		<Segmented
			label="Verfahren"
			options={[
				{ value: 'dark', label: 'Dunkle Gravur' },
				{ value: 'inverse', label: 'Inverse Gravur' },
				{ value: 'fill', label: 'Farbfüllung' }
			]}
			value={s.process}
			onchange={(process) => updateWood({ process })}
		/>
		<Segmented
			label="Tiefe"
			options={[
				{ value: 'low', label: 'Flach' },
				{ value: 'medium', label: 'Mittel' },
				{ value: 'high', label: 'Tief' }
			]}
			value={s.depth}
			onchange={(depth) => updateWood({ depth })}
		/>
		{#if s.process === 'fill'}
			<Segmented
				label="Füllfarbe"
				options={[
					{ value: 'black', label: 'Schwarz' },
					{ value: 'white', label: 'Weiß' },
					{ value: 'anthracite', label: 'Anthrazit' }
				]}
				value={s.fillColor}
				onchange={(fillColor) => updateWood({ fillColor })}
			/>
		{:else}
			<Segmented
				label="Brennfarbe"
				options={[
					{ value: 'low', label: 'Hellbraun' },
					{ value: 'medium', label: 'Mittelbraun' },
					{ value: 'high', label: 'Fast schwarz' }
				]}
				value={s.burn}
				onchange={(burn) => updateWood({ burn })}
			/>
		{/if}
	</ControlGroup>

	<ControlGroup title="Form & Größe" summary={SHAPE_LABEL[s.shape]}>
		<Segmented
			label="Form"
			options={[
				{ value: 'rectangle', label: 'Rechteck' },
				{ value: 'pill', label: 'Pille' },
				{ value: 'oval', label: 'Oval' }
			]}
			value={s.shape}
			onchange={(shape) => updateWood({ shape })}
		/>
		{#if s.shape === 'rectangle'}
			<Slider label="Eckradius" unit="mm" min={0} max={10} step={0.5} decimals={1} value={s.cornerRadius} onchange={(cornerRadius) => updateWood({ cornerRadius })} />
		{/if}
		<Segmented
			label="Rahmenlinie"
			options={[
				{ value: false, label: 'Ohne' },
				{ value: true, label: 'Mit Rahmen' }
			]}
			value={s.frame}
			onchange={(frame) => updateWood({ frame })}
		/>
		<Segmented
			label="Kante"
			options={[
				{ value: 'burnt', label: 'Gebrannt' },
				{ value: 'sanded', label: 'Geschliffen' }
			]}
			value={s.edge}
			onchange={(edge) => updateWood({ edge })}
		/>
		<Segmented
			label="Größe"
			options={[
				{ value: 'auto', label: 'Automatisch' },
				{ value: 'manual', label: 'Manuell' }
			]}
			value={s.sizeMode}
			onchange={(sizeMode) => updateWood({ sizeMode })}
		/>
		{#if s.sizeMode === 'manual'}
			<Slider label="Breite" unit="mm" min={limits.minWidth} max={limits.maxWidth} step={1} value={s.width} onchange={(width) => updateWood({ width })} />
			<Slider label="Höhe" unit="mm" min={limits.minHeight} max={limits.maxHeight} step={1} value={s.height} onchange={(height) => updateWood({ height })} />
		{/if}
	</ControlGroup>

	<ControlGroup title="Szene" summary={FRONT_LABEL[s.front]}>
		<div class="flex flex-col gap-2" role="group" aria-label="Möbelfront">
			<span class="text-sm text-ink-muted">Möbelfront</span>
			<div class="grid grid-cols-3 gap-2">
				{#each FRONTS as front (front)}
					<button
						type="button"
						class="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-xs transition-colors
							{front === s.front ? 'border-clay bg-clay-soft text-ink' : 'border-line bg-white text-ink-muted hover:border-ink-muted'}"
						aria-pressed={front === s.front}
						onclick={() => updateWood({ front })}
					>
						<span class="h-6 w-6 rounded-full ring-1 ring-black/10" style="background: {calibration.front.color[front]}"></span>
						{FRONT_LABEL[front]}
					</button>
				{/each}
			</div>
		</div>
		<Segmented
			label="Ansicht"
			options={[
				{ value: 'front', label: 'Frontal' },
				{ value: 'oblique', label: 'Schräg' }
			]}
			value={s.view}
			onchange={(view) => updateWood({ view })}
		/>
		<Slider label="Lichtrichtung" unit="°" min={0} max={359} step={1} value={s.lightAngle} onchange={(lightAngle) => updateWood({ lightAngle })} />
	</ControlGroup>
</div>
