/** Stellt die Schriften aus static/fonts für Tests bereit (über Vite eingebettet). */
import { parseFont, type LoadedFont } from './fonts';
import type { FontId, FontWeight } from './types';

const files = import.meta.glob<string>('/static/fonts/*/*.woff', { query: '?inline', import: 'default', eager: true });

function dataUrlToBuffer(dataUrl: string): ArrayBuffer {
	const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
	const buffer = new ArrayBuffer(binary.length);
	const bytes = new Uint8Array(buffer);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return buffer;
}

export function loadTestFont(id: FontId, weight: FontWeight): LoadedFont {
	const dataUrl = files[`/static/fonts/${id}/${id}-latin-${weight}-normal.woff`];
	if (!dataUrl) throw new Error(`Testschrift fehlt: ${id} ${weight}`);
	const result = parseFont(id, weight, dataUrlToBuffer(dataUrl));
	if (!result.ok) throw new Error(`Testschrift nicht lesbar: ${result.error.kind}`);
	return result.value;
}
