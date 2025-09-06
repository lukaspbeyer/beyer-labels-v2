<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import FormatSelector from '$components/FormatSelector.svelte';
  import LabelForm from '$components/LabelForm.svelte';
  import GridSelector from '$components/GridSelector.svelte';
  import PictogramEditor from '$components/PictogramEditor.svelte';
  import PrintSetup from '$components/PrintSetup.svelte';
  import { formats, currentFormat } from '$stores/format';
  import type { LabelFormat } from '$utils/types';
  
  let isLoading = true;
  let error: string | undefined;
  
  onMount(async () => {
    try {
      const response = await fetch('/api/label-formats');
      if (!response.ok) throw new Error('Failed to load formats');
      
      const data: Record<string, LabelFormat> = await response.json();
      formats.set(data);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Beyer Labels - Elegante Etiketten mit KI-Piktogrammen</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-6 py-6">
  <header class="text-center mb-12">
    <h1 class="text-5xl font-bold mb-2 bg-gradient-to-br from-blue-500 to-indigo-600 bg-clip-text text-transparent" style="font-family: 'Sora', system-ui, sans-serif;">
      Beyer Labels
    </h1>
    <p class="text-lg text-gray-500">
      Elegante Etiketten mit optionalen KI-generierten Piktogrammen
    </p>
  </header>
  
  {#if isLoading}
    <div class="text-center py-12 text-gray-500">Lade Formate...</div>
  {:else if error}
    <div class="error-box max-w-md mx-auto">Fehler: {error}</div>
  {:else}
    <main class="flex flex-col">
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-4">
            <h3 class="control-group">Format & Text</h3>
            <div class="control-card">
              <FormatSelector formats={$formats} />
            </div>
            <div class="control-card">
              <LabelForm />
            </div>
          </div>
          
          <div class="flex flex-col gap-4">
            <h3 class="control-group">Position & Piktogramm</h3>
            <div class="control-card">
              <GridSelector />
            </div>
            {#if $currentFormat?.hasPictogram}
              <div class="control-card">
                <PictogramEditor />
              </div>
            {/if}
          </div>
        </div>
        
        <div class="sticky top-6 control-card">
          <PrintSetup />
        </div>
      </div>
    </main>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #f5f5f7;
    color: #1d1d1f;
    font-family: 'Noto Sans', system-ui, -apple-system, sans-serif;
  }
  
  :global(*) {
    box-sizing: border-box;
  }
  
  @media (max-width: 1024px) {
    :global(.sticky) {
      position: static;
    }
  }
</style>
