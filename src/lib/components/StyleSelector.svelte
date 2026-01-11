<script lang="ts">
	import { selectedStyleId, selectStyle } from '$stores/style';
	import { LABEL_STYLES } from '$utils/labelStyles';
</script>

<div class="flex gap-3 p-6">
	{#each Object.entries(LABEL_STYLES) as [id, style]}
		<button
			class="style-btn {$selectedStyleId === id ? 'selected' : ''}"
			on:click={() => selectStyle(id)}
			data-style={id}
		>
			<span class="block font-semibold text-sm mb-1">{style.name}</span>
			<span class="block text-xs opacity-70">{style.description}</span>
		</button>
	{/each}
</div>

<style>
	.style-btn {
		flex: 1;
		padding: 1rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 0.75rem;
		transition: all 0.2s ease;
		text-align: left;
		cursor: pointer;
	}

	.style-btn:hover {
		border-color: #3b82f6;
		background: #eff6ff;
	}

	.style-btn:focus {
		outline: none;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
		border-color: #3b82f6;
	}

	.style-btn.selected {
		border-color: #3b82f6;
		background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
		color: white;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.style-btn.selected .opacity-70 {
		opacity: 0.85;
	}
</style>
