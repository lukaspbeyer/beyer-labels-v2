/**
 * MCP-Server: zwei Werkzeuge für Agenten. `list_products` nennt die Produkte mit Feldern,
 * Obergrenzen und Beispiel; `render_product` erzeugt die Datei und liefert einen Link,
 * oder nennt, was am Inhalt zu ändern ist. Der Server merkt sich keine Inhalte.
 */
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { KURA } from '$lib/kura/kura';
import { listProducts, makeProduct } from '$lib/products/orders';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { FILE_LIFETIME_SECONDS, storeFile, type FileStore } from './files';

export interface McpDeps {
	/** Lädt die Schrift des geltenden Kura */
	loadFont(): Promise<LoadedFont | null>;
	store: FileStore;
	/** Ursprung der öffentlichen Adresse, etwa https://kura.example.com */
	origin: string;
}

const INSTRUCTIONS =
	'Erzeugt Drucksachen und Laserdateien im Hausdesign Kura der Familie Beyer. ' +
	'Zuerst list_products aufrufen: Es nennt je Produkt die Felder, die Obergrenzen und ein Beispiel. ' +
	'Dann render_product mit dem vollständigen Inhalt; der Server merkt sich nichts zwischen den Aufrufen. ' +
	'Kommt statt eines Links eine Liste von Hinweisen zurück, den Inhalt entsprechend kürzen oder korrigieren und erneut senden. ' +
	'Die Gestaltung ist festgelegt und nicht einstellbar.';

function text(value: string) {
	return { content: [{ type: 'text' as const, text: value }] };
}

export function createKuraMcpHandler(deps: McpDeps) {
	return createMcpHandler(() => {
		const server = new McpServer({ name: 'kura', version: '1.0.0' }, { instructions: INSTRUCTIONS });

		server.registerTool(
			'list_products',
			{
				title: 'Produkte auflisten',
				description: 'Nennt alle Produkte im Hausdesign Kura mit Feldern, Obergrenzen, Ausgabeformat und einem gültigen Beispielinhalt.',
				annotations: { readOnlyHint: true }
			},
			async () => text(JSON.stringify({ products: listProducts() }, null, 2))
		);

		server.registerTool(
			'render_product',
			{
				title: 'Produkt erzeugen',
				description:
					'Erzeugt die Datei eines Produkts (PDF für den Druck, SVG für den Laser) und liefert einen Link, der 24 Stunden ohne Anmeldung abrufbar ist. ' +
					'Verletzt der Inhalt eine Regel, kommt keine Datei, sondern eine Liste von Hinweisen, was zu ändern ist.',
				inputSchema: z.object({
					product: z.string().describe('Kennung des Produkts aus list_products, etwa "tagesuebersicht".'),
					content: z.record(z.string(), z.unknown()).describe('Der vollständige Inhalt mit den Feldern, die list_products für das Produkt nennt.')
				})
			},
			async ({ product, content }) => {
				const font = await deps.loadFont();
				if (!font) return { ...text('Die Schrift konnte nicht geladen werden. Später erneut versuchen.'), isError: true };
				const made = await makeProduct(KURA, product, content, font);
				if (!made.ok) {
					return { ...text(JSON.stringify({ created: false, hints: made.error.map((h) => h.message) }, null, 2)), isError: true };
				}
				const url = deps.origin + (await storeFile(deps.store, made.value));
				const result = { created: true, url, fileName: made.value.fileName, mimeType: made.value.mime, validForHours: FILE_LIFETIME_SECONDS / 3600 };
				return {
					content: [
						{ type: 'text' as const, text: JSON.stringify(result, null, 2) },
						{ type: 'resource_link' as const, uri: url, name: made.value.fileName, mimeType: made.value.mime }
					]
				};
			}
		);

		return server;
	});
}
