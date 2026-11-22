<script lang="ts" generics="T extends string | number | boolean">
	interface Option {
		value: T;
		label: string;
	}

	interface Props {
		label: string;
		options: readonly Option[];
		value: T;
		onchange: (value: T) => void;
		disabled?: boolean;
	}

	let { label, options, value, onchange, disabled = false }: Props = $props();
</script>

<div class="flex flex-col gap-2" role="group" aria-label={label}>
	<span class="text-sm text-ink-muted">{label}</span>
	<div class="flex flex-wrap gap-1 rounded-xl bg-sand p-1">
		{#each options as option (option.value)}
			<button
				type="button"
				class="min-h-11 min-w-11 flex-1 rounded-lg px-3 text-sm transition-colors disabled:opacity-40
					{option.value === value ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-ink-muted hover:text-ink'}"
				aria-pressed={option.value === value}
				{disabled}
				onclick={() => onchange(option.value)}
			>
				{option.label}
			</button>
		{/each}
	</div>
</div>
