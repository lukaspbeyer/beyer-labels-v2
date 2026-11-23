/**
 * Die Schrift einer Seite: einmal geladen, mit Fehlerzustand. Alle Seiten teilen einen Lader,
 * eine Antwort auf eine überholte Wahl wird verworfen.
 */
import { createFontLoader, type FontLoader, type LoadedFont } from './fonts';
import type { FontId, FontWeight } from './types';

export interface FontState {
	/** Die gewählte Schrift, sobald sie geladen ist; sonst `null` */
	readonly font: LoadedFont | null;
	/** Die zuletzt geladene Schrift; steht, bis die neu gewählte da ist */
	readonly last: LoadedFont | null;
	readonly failed: boolean;
}

let shared: FontLoader | null = null;

/** In einer Komponente aufrufen. `loader` lässt sich für Tests ersetzen. */
export function useFont(typeface: () => { font: FontId; weight: FontWeight }, loader?: FontLoader): FontState {
	// Schriftobjekte nicht reaktiv verpacken; nur der Austausch zählt
	let loaded = $state.raw<LoadedFont | null>(null);
	let failed = $state(false);

	$effect(() => {
		const { font, weight } = typeface();
		const from = loader ?? (shared ??= createFontLoader(fetch));
		let live = true;
		from.load(font, weight).then((result) => {
			if (!live) return;
			failed = !result.ok;
			if (result.ok) loaded = result.value;
		});
		return () => {
			live = false;
		};
	});

	return {
		get font() {
			const { font, weight } = typeface();
			return loaded && loaded.id === font && loaded.weight === weight ? loaded : null;
		},
		get last() {
			return loaded;
		},
		get failed() {
			return failed;
		}
	};
}
