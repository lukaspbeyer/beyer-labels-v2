import { describe, expect, it } from 'vitest';
import { accessConfig, verifyAccess } from './access';
import { FILE_LIFETIME_SECONDS, readFile, storeFile, type FileStore } from './files';

function memoryStore() {
	const entries = new Map<string, { value: ArrayBuffer | string; ttl: number; metadata: unknown }>();
	const store: FileStore = {
		async put(key, value, options) {
			entries.set(key, { value, ttl: options.expirationTtl, metadata: options.metadata });
		},
		async getWithMetadata(key) {
			const entry = entries.get(key);
			if (!entry) return { value: null, metadata: null };
			const value = typeof entry.value === 'string' ? (new TextEncoder().encode(entry.value).buffer as ArrayBuffer) : entry.value;
			return { value, metadata: entry.metadata };
		}
	};
	return { store, entries };
}

describe('Dateiablage', () => {
	it('legt für 24 Stunden unter einem langen Zufallsschlüssel ab und liefert die Datei zurück', async () => {
		const { store, entries } = memoryStore();
		const path = await storeFile(store, { fileName: 'tagesübersicht.pdf', mime: 'application/pdf', body: new Uint8Array([37, 80, 68, 70]) });
		const [, , key, name] = path.split('/');
		expect(key).toMatch(/^[0-9a-f]{48}$/);
		expect(decodeURIComponent(name)).toBe('tagesübersicht.pdf');
		expect([...entries.values()][0].ttl).toBe(FILE_LIFETIME_SECONDS);
		const file = await readFile(store, key);
		expect(file && [file.mime, file.fileName, new Uint8Array(file.body)[0]]).toEqual(['application/pdf', 'tagesübersicht.pdf', 37]);
	});

	it('vergibt je Datei einen eigenen Schlüssel', async () => {
		const { store } = memoryStore();
		const file = { fileName: 'a.svg', mime: 'image/svg+xml', body: '<svg/>' };
		expect(await storeFile(store, file)).not.toBe(await storeFile(store, file));
	});

	it('findet nichts unter unbekannten oder fehlgeformten Schlüsseln', async () => {
		const { store } = memoryStore();
		expect(await readFile(store, 'a'.repeat(48))).toBeNull();
		expect(await readFile(store, '../geheim')).toBeNull();
	});
});

describe('Anmeldung über Cloudflare Access', () => {
	const request = (headers: Record<string, string> = {}) => new Request('https://kura.example/mcp', { headers });

	it('gilt erst als eingerichtet, wenn Team-Domain und Kennung der Anwendung gesetzt sind', () => {
		expect(accessConfig(undefined)).toBeNull();
		expect(accessConfig({ ACCESS_TEAM_DOMAIN: 'beyer.cloudflareaccess.com' })).toBeNull();
		expect(accessConfig({ ACCESS_TEAM_DOMAIN: 'https://beyer.cloudflareaccess.com/', ACCESS_AUD: 'abc' })).toEqual({ teamDomain: 'beyer.cloudflareaccess.com', audience: 'abc' });
	});

	it('lehnt ab, solange Access nicht eingerichtet ist', async () => {
		expect(await verifyAccess(request({ 'Cf-Access-Jwt-Assertion': 'x' }), null)).toEqual({ ok: false, error: 'not-configured' });
	});

	it('lehnt Anfragen ohne Token und mit ungültigem Token ab', async () => {
		const config = { teamDomain: 'beyer.cloudflareaccess.com', audience: 'abc' };
		expect(await verifyAccess(request(), config)).toEqual({ ok: false, error: 'missing-token' });
		expect(await verifyAccess(request({ 'Cf-Access-Jwt-Assertion': 'kein.jwt.token' }), config)).toEqual({ ok: false, error: 'invalid-token' });
	});
});
