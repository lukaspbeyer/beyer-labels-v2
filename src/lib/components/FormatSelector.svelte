<script lang="ts">
  import type { LabelFormat } from '$utils/types';
  import { selectedFormatId, selectFormat } from '$stores/format';
  
  export let formats: Record<string, LabelFormat>;
</script>

<div class="flex gap-3 p-6">
  {#each Object.entries(formats) as [id, format]}
    <button
      class="format-btn {$selectedFormatId === id ? 'selected' : ''}"
      on:click={() => selectFormat(id)}
      data-format={id}
    >
      <span class="block font-semibold text-sm mb-1">{format.name}</span>
      <span class="block text-xs opacity-70">{format.name}</span>
    </button>
  {/each}
</div>

<style>
  /* All styles moved to Tailwind classes and global component styles */
</style>