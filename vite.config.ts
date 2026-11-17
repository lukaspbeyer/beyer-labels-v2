import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// opentype.js liefert ESM nur über das Feld "module"; beim SSR mitbündeln statt als CommonJS laden
	ssr: { noExternal: ['opentype.js'] }
});
