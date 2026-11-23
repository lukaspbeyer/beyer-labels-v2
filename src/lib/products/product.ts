/**
 * Produkt: eine herstellbare Sache in Kura auf genau einem Medium.
 * Jedes Produkt beschreibt sich an einer Stelle: wer es ist, was ein Agent senden darf,
 * wie Inhalt von außen gelesen wird und wie daraus der Satz und die Datei entstehen.
 * Übersicht, Werkbank, Navigation, Produktseite und MCP lesen dieselbe Beschreibung.
 */
import type { Kura } from '$lib/kura/kura';
import type { ExampleView, Medium, MediumFile } from '$lib/media/medium';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { err, ok, type Result } from '$utils/result';
import { hint, within, type Hint } from './hint';

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
	/** Dateiformat des Ergebnisses, aus dem Medium */
	output: Medium['output'];
	description: string;
	fields: OrderField[];
	/** Ein gültiger Inhalt als Vorlage */
	example: unknown;
}

/** Die Datei einer Bestellung; das Medium baut sie und nennt ihren Medientyp. */
export type OrderFile = MediumFile;

/** Ein gesetztes Stück: ein Label, ein Etikett, ein Tag. Seine Hinweise stehen relativ zum Stück. */
export interface PieceProof {
	hints: Hint[];
}

/** Der gesetzte Inhalt: was zu sehen ist, was daran zu ändern wäre und die Datei dazu. */
export interface Proof {
	/** Alle Hinweise, jeder relativ zu seinem Stück. Wer mehrere Stücke zeigt, liest sie je Stück. */
	hints: Hint[];
	fileName: string;
	/** Erzeugt die Datei. Ob Hinweise die Datei sperren, entscheidet der Aufrufer; `make` sperrt immer. */
	file(): Promise<OrderFile>;
}

/** Was `set` eines Produkts liefert: unter dem Feld der Liste je Stück sein Satz, in der Reihenfolge der Bestellung, dazu die eine Datei. */
type Setting<L extends string> = Record<L, readonly PieceProof[]> & Omit<Proof, 'hints'>;

/** Ein Beispiel, gesetzt wie jede Bestellung: Beschriftung, Hinweise des Satzes und die Ansicht des Mediums. */
export interface ProductExample {
	caption: string;
	hints: Hint[];
	/** Wie das Medium das Beispiel maßstäblich vor seiner Umgebung zeigt */
	view: ExampleView;
}

/**
 * Gelesener Inhalt. Neben den Hinweisen steht, was sich trotzdem setzen lässt (`null`: nichts),
 * damit ein Agent alle Verstöße auf einmal erfährt, die der Form und die des Satzes.
 */
export interface Parsed<T> {
	value: T | null;
	hints: Hint[];
}

/**
 * Eine Bestellung: was für alle Stücke gilt (etwa das Format des Bogens) und unter `L` die Liste der Stücke.
 * Ein Inhalt von außen ist ein einzelnes Stück oder `{ [L]: [...] }`; die Bestellung hat immer die Liste.
 */
type OrderOf<L extends string> = Record<L, readonly unknown[]>;

interface ProductDefinition<L extends string, Order extends OrderOf<L>, S extends Setting<L>> {
	id: string;
	name: string;
	/** Das Medium; von ihm kommen Dateiformat, Datei und Beispielansicht */
	medium: Medium;
	/** Kurzer Name für die Navigation */
	nav: string;
	/** Ein Satz für die Übersicht: was es ist und wie man es bekommt */
	summary: string;
	/** Seite des Produkts */
	href: string;
	/** Beschreibung, Felder und Beispiel für Agenten; Maße und Grenzen folgen dem übergebenen Kura */
	order(kura: Kura): Pick<OrderSpec, 'description' | 'fields' | 'example'>;
	/** Ein oder mehrere Stücke in einer Datei */
	pieces: {
		/** Feld der Liste im Inhalt und in der Bestellung, etwa `labels` */
		list: L;
		/** Höchstzahl der Stücke in einer Datei und der Hinweis, wenn es keins oder zu viele sind */
		limit(shared: Omit<Order, L>): { max: number; message: string };
		/** Liest, was auf oberster Ebene für alle Stücke gilt. Ein Hinweis hier heißt: kein Stück wird gelesen. */
		shared?(top: Record<string, unknown>): Result<Omit<Order, L>, Hint[]>;
	};
	/**
	 * Liest ein Stück von außen: Form, Wahlwerte und Obergrenzen; Hinweise relativ zum Stück.
	 * `top` ist die oberste Ebene des Inhalts, für Vorgaben, die ein Stück erbt; bei einem einzelnen Stück ist es das Stück selbst.
	 */
	parse(entry: unknown, shared: Omit<Order, L>, top: Record<string, unknown>): Parsed<Order[L][number]>;
	/**
	 * Setzt die Stücke in Kura und prüft sie gegen Kura, die Unterregeln und die Fertigungsgrenzen.
	 * Liefert unter `L` je Stück seinen Satz mit Hinweisen relativ zum Stück, Stück für Stück wie in der Bestellung;
	 * Schritte über alle Stücke (Plätze auf dem Bogen) und die eine Datei aus allen Stücken gehören hierher.
	 */
	set(kura: Kura, order: Order, font: LoadedFont): S;
	/**
	 * Beispiele als Bestellungen. Sie gehen durch `set` wie die Bestellung eines Agenten;
	 * so zeigt und prüft die Werkbank eine Änderung an Kura auf demselben Weg.
	 */
	examples: readonly { caption: string; order: Order }[];
	/** Wie das Medium den Satz eines Beispiels zeigt; `index` ist die Stelle des Beispiels in `examples` */
	exampleView(kura: Kura, setting: S, index: number): ExampleView;
	/** Hinweise, die für das Produkt als Ganzes gelten */
	notes?(kura: Kura, font: LoadedFont): Hint[];
}

/** Ein Produkt, wie es die Listen sehen: ohne Wissen über die Form seines Inhalts. */
export interface Product {
	id: string;
	name: string;
	medium: Medium;
	nav: string;
	summary: string;
	href: string;
	spec(kura: Kura): OrderSpec;
	/** Inhalt von außen zur Datei. Jeder Hinweis heißt: keine Datei. Hinweise nennen das Stück nur, wenn eine Liste kam. */
	make(kura: Kura, content: unknown, font: LoadedFont): Promise<Result<OrderFile, Hint[]>>;
	/** Beispiele im übergebenen Kura; so zeigt die Werkbank die Wirkung einer Änderung */
	examples(kura: Kura, font: LoadedFont): ProductExample[];
	notes(kura: Kura, font: LoadedFont): Hint[];
}

/** Ein Produkt mit seiner Bestellung, wie es die eigene Seite und die eigenen Tests sehen. */
export interface TypedProduct<Order, S> extends Product {
	set(kura: Kura, order: Order, font: LoadedFont): S & Proof;
}

export function defineProduct<L extends string, Order extends OrderOf<L>, S extends Setting<L>>(definition: ProductDefinition<L, Order, S>): TypedProduct<Order, S> {
	const { id, name, medium, nav, summary, href, pieces } = definition;
	const { list } = pieces;

	/** Liest den Inhalt Stück für Stück. `places`: wo jedes Stück der Bestellung im Inhalt steht, auch wenn davor eines wegfiel. */
	function parse(raw: unknown): { order: Order | null; hints: Hint[]; places: Hint['at'][] } {
		const top = record(raw);
		const shared = pieces.shared ? pieces.shared(top) : ok({} as Omit<Order, L>);
		if (!shared.ok) return { order: null, hints: shared.error, places: [] };
		const listed = top[list];
		const entries: unknown[] = Array.isArray(listed) ? listed : [raw];
		const { max, message } = pieces.limit(shared.value);
		if (entries.length === 0 || entries.length > max) return { order: null, hints: [hint('too-many', message, [list])], places: [] };
		const hints: Hint[] = [];
		const read: Order[L][number][] = [];
		const places: Hint['at'][] = [];
		entries.forEach((entry, i) => {
			const place = Array.isArray(listed) ? [list, i] : [];
			const piece = definition.parse(entry, shared.value, top);
			hints.push(...within(place, piece.hints));
			if (piece.value !== null) {
				read.push(piece.value);
				places.push(place);
			}
		});
		return { order: read.length > 0 ? ({ ...shared.value, [list]: read } as unknown as Order) : null, hints, places };
	}

	return {
		id,
		name,
		medium,
		nav,
		summary,
		href,
		examples: (kura, font) =>
			definition.examples.map(({ caption, order }, index) => {
				const setting = definition.set(kura, order, font);
				return { caption, hints: setting[list].flatMap((piece) => piece.hints), view: definition.exampleView(kura, setting, index) };
			}),
		notes: (kura, font) => definition.notes?.(kura, font) ?? [],
		spec: (kura) => ({ id, name, medium: medium.name, output: medium.output, ...definition.order(kura) }),
		set(kura, order, font) {
			const setting = definition.set(kura, order, font);
			return { ...setting, hints: setting[list].flatMap((piece) => piece.hints) };
		},
		async make(kura, content, font) {
			const parsed = parse(content);
			const setting = parsed.order ? definition.set(kura, parsed.order, font) : null;
			const hints = [...parsed.hints, ...(setting?.[list].flatMap((piece, i) => within(parsed.places[i], piece.hints)) ?? [])];
			return setting && hints.length === 0 ? ok(await setting.file()) : err(hints);
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
