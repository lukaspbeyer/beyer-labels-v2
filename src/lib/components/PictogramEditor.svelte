<script lang="ts">
  import { onMount } from 'svelte';
  import { currentFormat } from '$stores/format';
  import { headline, pictogramUrl, pictogramPrompt } from '$stores/label';
  import { 
    generatePictograms, 
    isGenerating, 
    generationError,
    generatedPictograms,
    selectedPictogramIndex,
    selectedPictogramUrl,
    selectPictogram,
    clearPictograms
  } from '$stores/pictogram';
  import { trimVerticalWhitespace } from '$utils/imageProcessing';
  
  let prompt = '';
  let promptManuallyEdited = false;
  
  // Auto-generate prompt from headline if not manually edited
  $: if ($headline && !promptManuallyEdited) {
    prompt = generatePromptFromText($headline);
  }
  
  // Reset manual edit flag when format changes
  $: if ($currentFormat) {
    promptManuallyEdited = false;
  }
  
  // Update the main pictogramUrl when a selection is made
  $: if ($selectedPictogramUrl) {
    processSelectedPictogram($selectedPictogramUrl);
  }
  
  async function processSelectedPictogram(url: string) {
    // Try to trim vertical whitespace
    const trimResult = await trimVerticalWhitespace(url);
    
    if (trimResult.success && trimResult.imageUrl) {
      console.log('Image trimmed successfully:', trimResult.metrics);
      pictogramUrl.set(trimResult.imageUrl);
    } else {
      console.warn('Failed to trim image, using original:', trimResult.error);
      pictogramUrl.set(url);
    }
  }
  
  function generatePromptFromText(text: string): string {
    return `A single, hand-drawn minimalist line illustration in the style of Studio Ghibli. 
The subject is "${text}". 
It must be only one clear symbolic drawing, centered, without any frame, border, box, seal, stamp, or decorative outline. 
Drawn with expressive black ink-like strokes: gentle, poetic, slightly imperfect, evoking the warmth and simplicity of Ghibli hand drawings. 
Flat illustration only — no sticker effect, no shadows, no curled corners, no textures, no gradients. 
Always on a pure flat white background. 
Do not add extra lines, patterns, symbols, or decorations — show only the main subject. 
No text, no frames, no background elements.`;
  }
  
  function handlePromptChange(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    prompt = textarea.value;
    promptManuallyEdited = true;
  }
  
  async function handleGeneratePictograms() {
    if (!prompt.trim()) return;
    
    try {
      const result = await generatePictograms(prompt, '1024x1024', 4);
      
      if (result.success) {
        pictogramPrompt.set(prompt);
      }
    } catch (error) {
      console.error('Error generating pictograms:', error);
    }
  }
  
  function handleSelectPictogram(index: number) {
    selectPictogram(index);
  }
  
  function handleRegenerateNew() {
    clearPictograms();
    handleGeneratePictograms();
  }
</script>

<div class="p-6">
  <div class="mb-5">
    <h3 class="text-lg font-semibold text-beyer-gray-800">
      KI-Piktogramm generieren
    </h3>
    <p class="text-sm text-beyer-gray-500 mt-1">
      Für dieses Format ist ein Piktogramm erforderlich.
    </p>
  </div>
    <div class="animate-fade-in">
      <div class="mb-5">
        <label for="pictogramPrompt" class="block text-sm font-medium text-beyer-gray-900 mb-2">
          Piktogramm-Beschreibung
        </label>
        <textarea
          id="pictogramPrompt"
          bind:value={prompt}
          on:input={handlePromptChange}
          rows={4}
          placeholder="Beschreiben Sie das gewünschte Piktogramm..."
          class="w-full p-3 border border-gray-300 rounded-lg text-sm resize-y min-h-[100px] transition-colors duration-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-500"
        ></textarea>
      </div>
      
      <button
        class="btn-beyer w-full mb-4"
        on:click={handleGeneratePictograms}
        disabled={$isGenerating || !prompt.trim()}
      >
        {$isGenerating ? 'Generiere 4 Varianten...' : 'Piktogramme generieren'}
      </button>
      
      {#if $generationError}
        <div class="error-box mb-4">
          Fehler: {$generationError}
        </div>
      {/if}
      
      {#if $isGenerating}
        <div class="flex items-center gap-3 p-4 bg-beyer-gray-100 rounded-lg mb-4">
          <div class="spinner"></div>
          <span class="text-sm">Generiere 4 Piktogramm-Varianten...</span>
        </div>
      {/if}
      
      {#if $generatedPictograms.length > 0}
        <div class="pt-5 border-t border-gray-300">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-base font-semibold text-beyer-gray-900">Wählen Sie ein Piktogramm:</h4>
            <button
              class="text-sm text-beyer-blue hover:text-beyer-purple font-medium"
              on:click={handleRegenerateNew}
              disabled={$isGenerating}
            >
              Neu generieren
            </button>
          </div>
          
          <!-- Grid of 4 pictogram options -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            {#each $generatedPictograms as pictogram, index}
              <button
                class="pictogram-option {$selectedPictogramIndex === index ? 'selected' : ''}"
                on:click={() => handleSelectPictogram(index)}
                disabled={$isGenerating}
              >
                <img 
                  src={pictogram} 
                  alt={`Pictogram option ${index + 1}`} 
                  class="w-full h-full object-contain"
                />
              </button>
            {/each}
          </div>
          
          <!-- Large preview of selected pictogram -->
          {#if $selectedPictogramUrl}
            <div class="mt-6">
              <h4 class="text-base font-semibold mb-3 text-beyer-gray-900">Ausgewähltes Piktogramm:</h4>
              <div class="border-2 border-beyer-blue rounded-lg p-4 bg-white shadow-lg">
                <img 
                  src={$pictogramUrl} 
                  alt="Selected pictogram" 
                  class="max-w-[200px] max-h-[200px] mx-auto object-contain" 
                />
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
</div>

<style>
  .pictogram-option {
    @apply relative border-2 border-gray-300 rounded-lg p-2 bg-white cursor-pointer 
           transition-all duration-200 hover:scale-105 hover:border-blue-500 hover:shadow-md
           h-32 flex items-center justify-center;
  }
  
  .pictogram-option.selected {
    @apply border-blue-500 shadow-lg ring-2 ring-blue-500/20;
  }
  
  .pictogram-option img {
    @apply max-w-full max-h-full;
  }
  
  .pictogram-option:disabled {
    @apply opacity-50 cursor-not-allowed hover:scale-100;
  }
</style>