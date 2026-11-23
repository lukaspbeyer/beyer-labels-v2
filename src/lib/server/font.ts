/**
 * Die Schrift des geltenden Kura im Worker: einmal geladen, über Anfragen hinweg im Speicher der Instanz.
 * Im Worker kommt sie direkt aus den statischen Dateien (Bindung ASSETS): Der Weg über die eigene Adresse
 * endet an der Anmeldung der Seiten.
 */
import type { Kura } from '$lib/kura/kura';
import { createFontLoader, type LoadedFont } from '$lib/typesetting/fonts';

export interface FontSource {
	/** Statische Dateien des Workers; fehlt im Entwicklungsserver */
	assets?: { fetch: typeof fetch };
	/** Abruf über das Netz, wenn es keine statischen Dateien gibt */
	fetch: typeof fetch;
	origin: string;
}

let cached: { key: string; font: LoadedFont } | null = null;

export async function loadKuraFont(kura: Kura, source: FontSource): Promise<LoadedFont | null> {
	const key = `${kura.typeface.font}-${kura.typeface.weight}`;
	if (cached?.key === key) return cached.font;
	const { assets } = source;
	const read: typeof fetch = assets ? (input) => assets.fetch(new URL(String(input), source.origin)) : source.fetch;
	const loaded = await createFontLoader(read).load(kura.typeface.font, kura.typeface.weight);
	if (!loaded.ok) return null;
	cached = { key, font: loaded.value };
	return loaded.value;
}
