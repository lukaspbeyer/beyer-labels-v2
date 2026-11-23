/**
 * Bestellungen: was Agenten sehen. Die Liste nennt je Produkt, was zu senden ist;
 * aus einem Inhalt wird die Datei oder die Liste der Hinweise, was zu ändern ist.
 */
import { KURA, type Kura } from '$lib/kura/kura';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { err, type Result } from '$utils/result';
import { hint, type Hint } from './hint';
import type { OrderFile, OrderSpec } from './product';
import { PRODUCTS } from './registry';

export type { OrderField, OrderFile, OrderSpec } from './product';

/** Alle Produkte mit dem, was ein Agent für eine Bestellung wissen muss; Maße und Grenzen im geltenden Kura. */
export function listProducts(kura: Kura = KURA): OrderSpec[] {
	return PRODUCTS.map((product) => product.spec(kura));
}

/** Erzeugt die Datei eines Produkts oder nennt, was am Inhalt zu ändern ist. Jeder Hinweis heißt: keine Datei. */
export function makeProduct(kura: Kura, id: string, content: unknown, font: LoadedFont): Promise<Result<OrderFile, Hint[]>> {
	const product = PRODUCTS.find((p) => p.id === id);
	if (!product) return Promise.resolve(err([hint('product', `Unbekanntes Produkt „${id}“. Es gibt: ${PRODUCTS.map((p) => p.id).join(', ')}.`, ['product'])]));
	return product.make(kura, content, font);
}
