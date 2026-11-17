<script lang="ts">
	interface Props {
		label: string;
		value: number;
		min: number;
		max: number;
		step: number;
		unit?: string;
		decimals?: number;
		disabled?: boolean;
		onchange: (value: number) => void;
	}

	let { label, value, min, max, step, unit = '', decimals = 0, disabled = false, onchange }: Props = $props();
	const uid = $props.id();
	const id = `slider-${uid}`;

	function display(v: number): string {
		return v.toFixed(decimals).replace('.', ',');
	}

	function read(event: Event): void {
		const target = event.currentTarget;
		if (target instanceof HTMLInputElement) onchange(Number(target.value));
	}
</script>

<div class="flex flex-col gap-1">
	<div class="flex items-baseline justify-between text-sm">
		<label for={id} class="text-ink-muted">{label}</label>
		<span class="tabular-nums text-ink">{display(value)}{unit ? ` ${unit}` : ''}</span>
	</div>
	<input
		{id}
		type="range"
		class="h-11 w-full cursor-pointer accent-clay disabled:opacity-40"
		{min}
		{max}
		{step}
		{value}
		{disabled}
		oninput={read}
	/>
</div>
