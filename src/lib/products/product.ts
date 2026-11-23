/**
 * Produkt: eine herstellbare Sache in Kura auf genau einem Medium.
 * Jedes Produkt beschreibt sich an einer Stelle: wer es ist, was ein Agent senden darf,
 * wie Inhalt von außen gelesen wird und wie daraus der Satz und die Datei entstehen.
 * Übersicht, Werkbank, Navigation, Produktseite und MCP lesen dieselbe Beschreibung.
 */
import type { Kura } from '$lib/kura/kura';
import type { LabelLayout, WoodSettings } from '$lib/media/wood/types';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { err, ok, type Result } from '$utils/result';
import type { Hint } from './hint';

export interface OrderField {
	name: string;
	type: string;
	required: boolean;
	description: string;
}

/** Was ein Agent für eine Bestellung wissen muss. */
export interface OrderSpec {
	id: string;
	name: string;
	medium: string;
	/** Dateiformat des Ergebnisses */
	output: 'PDF' | 'SVG';
	description: string;
	fields: OrderField[];
	/** Ein gültiger Inhalt als Vorlage */
	example: unknown;
}

export interface OrderFile {
	fileName: string;
	mime: string;
	body: Uint8Array | string;
}

/** Der gesetzte Inhalt: was zu sehen ist, was daran zu ändern wäre und die Datei dazu. */
export interface Proof {
	hints: Hint[];
	fileName: string;
	/** Erzeugt die Datei. Ob Hinweise die Datei sperren, entscheidet der Aufrufer; `make` sperrt immer. */
	file(): Promise<OrderFile>;
}

export interface ProductExample {
	caption: string;
	/** Maßstäbliche Ansicht, 1 Einheit = 1 mm */
	svg: string;
	width: number;
	height: number;
	hints: Hint[];
	/** Farbe der Umgebung, vor der die Sache hängt oder liegt; gehört nicht zur Gestaltung */
	backdrop?: string;
	/** Bei Lärche: woraus der Renderer im Browser die Oberfläche rechnet; `svg` steht, bis das Holz geladen ist */
	wood?: { layout: LabelLayout; settings: WoodSettings };
}

/**
 * Gelesener Inhalt. Neben den Hinweisen steht, was sich trotzdem setzen lässt (`null`: nichts),
 * damit ein Agent alle Verstöße auf einmal erfährt, die der Form und die des Satzes.
 * Ein Teil, der nicht mehr an seiner Stelle im Inhalt steht, trägt sie als `index`.
 */
export interface Parsed<Order> {
	order: Order | null;
	hints: Hint[];
}

interface ProductDefinition<Order, P extends Proof> {
	id: string;
	name: string;
	medium: string;
	/** Kurzer Name für die Navigation */
	nav: string;
	/** Ein Satz für die Übersicht: was es ist und wie man es bekommt */
	summary: string;
	/** Seite des Produkts */
	href: string;
	output: OrderSpec['output'];
	/** Beschreibung, Felder und Beispiel für Agenten; Maße und Grenzen folgen dem übergebenen Kura */
	order(kura: Kura): Pick<OrderSpec, 'description' | 'fields' | 'example'>;
	/** Liest Inhalt von außen: Form, Wahlwerte und Obergrenzen */
	parse(raw: unknown): Parsed<Order>;
	/** Setzt den Inhalt in Kura und prüft ihn gegen Kura, die Unterregeln und die Fertigungsgrenzen */
	set(kura: Kura, order: Order, font: LoadedFont): P;
	/** Beispiele im übergebenen Kura; so zeigt die Werkbank die Wirkung einer Änderung */
	examples(kura: Kura, font: LoadedFont): ProductExample[];
	/** Hinweise, die für das Produkt als Ganzes gelten */
	notes?(kura: Kura, font: LoadedFont): Hint[];
}

/** Ein Produkt, wie es die Listen sehen: ohne Wissen über die Form seines Inhalts. */
export interface Product {
	id: string;
	name: string;
	medium: string;
	nav: string;
	summary: string;
	href: string;
	spec(kura: Kura): OrderSpec;
	/** Inhalt von außen zur Datei. Jeder Hinweis heißt: keine Datei. */
	make(kura: Kura, content: unknown, font: LoadedFont): Promise<Result<OrderFile, Hint[]>>;
	examples(kura: Kura, font: LoadedFont): ProductExample[];
	notes(kura: Kura, font: LoadedFont): Hint[];
}

/** Ein Produkt mit seinem Inhalt, wie es die eigene Seite und die eigenen Tests sehen. */
export interface TypedProduct<Order, P extends Proof> extends Product {
	parse(raw: unknown): Parsed<Order>;
	set(kura: Kura, order: Order, font: LoadedFont): P;
}

export function defineProduct<Order, P extends Proof>(definition: ProductDefinition<Order, P>): TypedProduct<Order, P> {
	const { id, name, medium, nav, summary, href, output, parse, set, examples } = definition;
	return {
		id,
		name,
		medium,
		nav,
		summary,
		href,
		parse,
		set,
		examples,
		notes: (kura, font) => definition.notes?.(kura, font) ?? [],
		spec: (kura) => ({ id, name, medium, output, ...definition.order(kura) }),
		async make(kura, content, font) {
			const parsed = parse(content);
			const proof = parsed.order ? set(kura, parsed.order, font) : null;
			const hints = [...parsed.hints, ...(proof?.hints ?? [])];
			return proof && hints.length === 0 ? ok(await proof.file()) : err(hints);
		}
	};
}

/** Inhalt von außen als Felder; alles andere gilt als leer. */
export function record(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Wahl aus festen Werten; `aliases` hält frühere Namen gültig. */
export function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T, field: string, aliases: Record<string, T> = {}): Result<T, Hint[]> {
	if (value === undefined || value === null || value === '') return ok(fallback);
	if (typeof value === 'string' && value in aliases) return ok(aliases[value]);
	return allowed.includes(value as T) ? ok(value as T) : err([{ kind: 'choice', at: [field], message: `erlaubt sind ${allowed.join(', ')}.` }]);
}
