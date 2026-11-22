/** Ablage erzeugter Dateien für 24 Stunden unter einem nicht erratbaren Schlüssel (ADR 0004). */
import type { OrderFile } from '$lib/products/orders';

/** Der Teil von Workers KV, den die Ablage braucht. */
export interface FileStore {
	put(key: string, value: ArrayBuffer | string, options: { expirationTtl: number; metadata: unknown }): Promise<void>;
	getWithMetadata(key: string, type: 'arrayBuffer'): Promise<{ value: ArrayBuffer | null; metadata: unknown }>;
}

export const FILE_LIFETIME_SECONDS = 24 * 60 * 60;

function randomKey(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Legt die Datei ab und liefert den Pfad, unter dem sie ohne Anmeldung abrufbar ist. */
export async function storeFile(store: FileStore, file: OrderFile): Promise<string> {
	const key = randomKey();
	const body = typeof file.body === 'string' ? file.body : (file.body.slice().buffer as ArrayBuffer);
	await store.put(key, body, { expirationTtl: FILE_LIFETIME_SECONDS, metadata: { mime: file.mime, fileName: file.fileName } });
	return `/d/${key}/${encodeURIComponent(file.fileName)}`;
}

export async function readFile(store: FileStore, key: string): Promise<{ body: ArrayBuffer; mime: string; fileName: string } | null> {
	if (!/^[0-9a-f]{48}$/.test(key)) return null;
	const { value, metadata } = await store.getWithMetadata(key, 'arrayBuffer');
	if (!value || typeof metadata !== 'object' || metadata === null) return null;
	const { mime, fileName } = metadata as { mime?: unknown; fileName?: unknown };
	return typeof mime === 'string' && typeof fileName === 'string' ? { body: value, mime, fileName } : null;
}
