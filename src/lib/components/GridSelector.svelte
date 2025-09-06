<script lang="ts">
  import { currentFormat, startPosition } from '$stores/format';
  import type { LabelFormat } from '$utils/types';
  
  // Reset position when format changes
  $: if ($currentFormat) {
    startPosition.set(0);
  }
  
  function handleCellClick(index: number) {
    startPosition.set(index);
  }
  
  // Generate array of cell indices
  $: cells = Array.from({ length: $currentFormat.grid.total }, (_, i) => i);
</script>

<!-- Hide for single-label formats (A5) -->
{#if $currentFormat.grid.total > 1}
  <div class="p-6">
    <h3 class="text-base font-semibold text-gray-900 mb-3">
      Position auf dem Blatt
    </h3>
    <div 
      class="grid gap-1.5 max-w-52 mx-auto {$currentFormat.grid.columns === 2 ? 'max-w-32' : ''}"
      style="grid-template-columns: repeat({$currentFormat.grid.columns}, 1fr); grid-template-rows: repeat({$currentFormat.grid.rows}, 1fr)"
    >
      {#each cells as index}
        <button
          class="grid-cell {$startPosition === index ? 'selected' : ''} {$currentFormat.grid.columns === 2 ? 'aspect-[105/74]' : 'aspect-[1.4]'}"
          data-index={index}
          on:click={() => handleCellClick(index)}
          aria-label="Position {index + 1}"
        ></button>
      {/each}
    </div>
  </div>
{/if}

<style>
  @media (max-width: 480px) {
    .max-w-52 {
      max-width: 150px;
    }
    .max-w-32 {
      max-width: 100px;
    }
  }
</style>