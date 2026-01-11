<script lang="ts">
  import { headline, body } from '$stores/label';
</script>

<div class="p-6">
  <div class="mb-5">
    <label for="mainText" class="block text-sm font-medium text-gray-900 mb-2">
      Haupttext
    </label>
    <input
      type="text"
      id="mainText"
      bind:value={$headline}
      placeholder="z.B. WERKZEUGE"
      class="input-beyer"
    />
  </div>
  
  <div class="mb-0">
    <label for="subText" class="block text-sm font-medium text-gray-900 mb-2">
      Untertitel (optional, Markdown)
    </label>
    <textarea
      id="subText"
      bind:value={$body}
      placeholder="z.B. Schraubenzieher & Zangen&#10;&#10;Markdown: **fett**, *kursiv*, Listen mit - oder *"
      rows="3"
      class="input-beyer resize-y"
    ></textarea>
  </div>
</div>

<style>
  /* All styles moved to Tailwind classes and global component styles */
</style>