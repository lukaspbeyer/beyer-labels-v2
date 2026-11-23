/**
 * Medium: ein Herstellungsweg mit eigener Ausgabe (ADR 0001). Jedes Medium beschreibt sich hier einmal:
 * welche Datei es liefert, und wie es ein Beispiel vor seiner Umgebung zeigt.
 * Produkte bauen ihre Datei und ihre Beispiele nur über ihr Medium; Übersicht und Werkbank zeigen
 * ein Beispiel über `components/media/ExampleView.svelte`, ohne die Medien zu kennen.
 */
import type { PaperExampleView } from './paper/medium';
import type { WoodExampleView } from './wood/medium';

/** Ein Medium, wie Produkte und Agenten es sehen. */
export interface Medium {
	id: string;
	/** Name für Menschen und Agenten, etwa „Papier-Druck“ */
	name: string;
	/** Dateiformat der Ausgabe für Agenten */
	output: 'PDF' | 'SVG';
	/** Medientyp derselben Datei; gehört zu `output` und kommt aus derselben Beschreibung */
	mime: string;
}

/** Die Datei, die ein Medium aus dem Gesetzten macht. */
export interface MediumFile {
	fileName: string;
	mime: string;
	body: Uint8Array | string;
}

/**
 * Wie ein Medium ein Beispiel zeigt: maßstäblich (`width` × `height` in mm) vor `backdrop`, der Farbe der Umgebung.
 * Die Umgebung gehört nicht zur Gestaltung. Was das Medium sonst zum Zeichnen braucht, steht in seiner Variante.
 */
export type ExampleView = WoodExampleView | PaperExampleView;

/** Was jede Beispielansicht trägt, gleich welches Medium. */
export interface ExampleViewBase {
	width: number;
	height: number;
	/** CSS-Farbe der Umgebung, vor der die Sache hängt oder liegt */
	backdrop: string;
}
