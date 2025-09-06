<script lang="ts">
  import { onMount } from 'svelte';
  import { currentFormat } from '$stores/format';
  import { headline, pictogramUrl, pictogramPrompt } from '$stores/label';
  import { generatePictogram, isGenerating, generationError } from '$stores/pictogram';
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
  
  async function handleGeneratePictogram() {
    if (!prompt.trim()) return;
    
    try {
      const result = await generatePictogram(prompt, '1024x1024');
      
      if (result.success && result.imageUrl) {
        // Try to trim vertical whitespace
        const trimResult = await trimVerticalWhitespace(result.imageUrl);
        
        if (trimResult.success && trimResult.imageUrl) {
          console.log('Image trimmed successfully:', trimResult.metrics);
          pictogramUrl.set(trimResult.imageUrl);
        } else {
          console.warn('Failed to trim image, using original:', trimResult.error);
          pictogramUrl.set(result.imageUrl);
        }
        
        pictogramPrompt.set(prompt);
      }
    } catch (error) {
      console.error('Error generating pictogram:', error);
    }
  }
  
  // No toggle function needed - format determines pictogram requirement
</script>

<div class="p-6">
  <div class="mb-5">
    <h3 class="text-lg font-semibold text-gray-800">
      KI-Piktogramm generieren
    </h3>
    <p class="text-sm text-gray-600 mt-1">
      Für dieses Format ist ein Piktogramm erforderlich.
    </p>
  </div>
    <div class="animate-fade-in">
      <div class="mb-5">
        <label for="pictogramPrompt" class="block text-sm font-medium text-gray-900 mb-2">
          Piktogramm-Beschreibung
        </label>
        <textarea
          id="pictogramPrompt"
          bind:value={prompt}
          on:input={handlePromptChange}
          rows={4}
          placeholder="Beschreiben Sie das gewünschte Piktogramm..."
          class="w-full p-3 border border-gray-200 rounded-lg text-sm resize-y min-h-[100px] transition-colors duration-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400"
        ></textarea>
      </div>
      
      <button
        class="btn-beyer w-full mb-4"
        on:click={handleGeneratePictogram}
        disabled={$isGenerating || !prompt.trim()}
      >
        {$isGenerating ? 'Generiere...' : 'Piktogramm generieren'}
      </button>
      
      {#if $generationError}
        <div class="error-box mb-4">
          Fehler: {$generationError}
        </div>
      {/if}
      
      {#if $isGenerating}
        <div class="flex items-center gap-3 p-4 bg-gray-100 rounded-lg mb-4">
          <div class="spinner"></div>
          <span class="text-sm">Generiere Piktogramm...</span>
        </div>
      {/if}
      
      {#if $pictogramUrl}
        <div class="pt-5 border-t border-gray-200">
          <h4 class="text-base font-semibold mb-3 text-gray-900">Vorschau:</h4>
          <img 
            src={$pictogramUrl} 
            alt="Generated pictogram" 
            class="max-w-[150px] max-h-[150px] border border-gray-200 rounded-lg p-2 bg-white" 
          />
        </div>
      {/if}
    </div>
</div>

<style>
  /* All styles moved to Tailwind classes and global component styles */
</style>