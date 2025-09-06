<script lang="ts">
  import { currentFormat, labelPosition } from '$stores/format';
  import { currentLabel, headline, body, pictogramRequired, pictogramUrl, clearLabel } from '$stores/label';
  import type { PrintData } from '$utils/types';
  
  // Check if printing is allowed
  $: canPrint = !$pictogramRequired || ($pictogramRequired && !!$pictogramUrl);
  
  async function handlePrint() {
    if (!canPrint) return;
    
    const printData: PrintData = {
      label: $currentLabel,
      format: {
        size: $currentFormat.id,
        position: $labelPosition
      },
      formatConfig: $currentFormat
    };
    
    try {
      const response = await fetch('/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(printData)
      });
      
      if (!response.ok) {
        throw new Error('Print request failed');
      }
      
      const html = await response.text();
      
      // Open print window - NO automatic printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Set helpful title for user
        printWindow.document.title = 'Beyer Labels - Druckansicht (Strg+P oder Cmd+P zum Drucken)';
      }
    } catch (error) {
      console.error('Error preparing print view:', error);
      alert('Fehler beim Vorbereiten der Druckansicht');
    }
  }
  
  function handleReset() {
    clearLabel();
  }
</script>

<div class="p-6">
  <h2 class="text-xl font-semibold mb-5 text-gray-800">
    Druckvorbereitung
  </h2>
  
  <div class="bg-gray-100 rounded-lg p-4 mb-5">
    <div class="mb-2 text-sm leading-relaxed">
      <strong class="text-gray-900 font-semibold">Format:</strong> {$currentFormat.name}
    </div>
    <div class="mb-2 text-sm leading-relaxed">
      <strong class="text-gray-900 font-semibold">Haupttext:</strong> {$headline || 'Nicht ausgefüllt'}
    </div>
    {#if $body}
      <div class="mb-2 text-sm leading-relaxed">
        <strong class="text-gray-900 font-semibold">Untertitel:</strong> {$body}
      </div>
    {/if}
    {#if $pictogramRequired}
      <div class="mb-0 text-sm leading-relaxed">
        <strong class="text-gray-900 font-semibold">Piktogramm:</strong> 
        {#if $pictogramUrl}
          <span class="text-green-600 font-semibold">✓ Bereit</span>
        {:else}
          <span class="text-red-600 font-semibold">⚠️ Erforderlich - bitte generieren</span>
        {/if}
      </div>
    {/if}
  </div>
  
  {#if $pictogramRequired && !$pictogramUrl}
    <div class="p-3 bg-yellow-50 border border-yellow-400 rounded-lg mb-5 text-sm text-yellow-800">
      ⚠️ Piktogramm ist für diese Konfiguration erforderlich. Bitte erst generieren.
    </div>
  {/if}
  
  
  <div class="flex gap-3 mt-6">
    <button 
      class="print-btn {!canPrint ? 'disabled' : ''}"
      on:click={handlePrint}
      disabled={!canPrint}
      title={!canPrint ? "Piktogramm erforderlich für diese Konfiguration" : ""}
    >
      Drucken
    </button>
    <button 
      class="reset-btn"
      on:click={handleReset}
    >
      Zurücksetzen
    </button>
  </div>
</div>

<style>
  /* Print and Reset buttons with custom styling (not Tailwind) */
  .print-btn, .reset-btn {
    flex: 1;
    padding: 14px 24px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .print-btn {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
  }
  
  .print-btn:hover:not(.disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
  }
  
  .print-btn.disabled {
    background: #6c757d;
    cursor: not-allowed;
    transform: none;
  }
  
  .reset-btn {
    background: #6c757d;
    color: white;
  }
  
  .reset-btn:hover {
    background: #5a6268;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
  }
  
  @media (max-width: 768px) {
    .print-btn, .reset-btn {
      flex-direction: column;
    }
  }
</style>