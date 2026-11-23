/**
 * Produktliste. Jedes Produkt beschreibt sich in seinem eigenen Modul (`product.ts`);
 * wer sich hier einträgt, erscheint in Übersicht, Werkbank, Navigation und bei den Agenten.
 */
import { daySheet } from './daySheet';
import { paperLabel } from './paperLabel';
import type { Product } from './product';
import { woodLabel } from './woodLabel';

export type { Product, ProductExample } from './product';

export const PRODUCTS: readonly Product[] = [woodLabel, paperLabel, daySheet];
