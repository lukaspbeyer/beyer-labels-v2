import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { KURA } from '$lib/kura/kura';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { accessConfig, decideAccess, verifyAccess } from './access';
import { FILE_LIFETIME_SECONDS, readFile, storeFile, type FileStore } from './files';
import { createKuraMcpHandler } from './mcp';

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

describe('Zugangsregel des Workers', () => {
	const env = { ACCESS_TEAM_DOMAIN: 'beyer.cloudflareaccess.com', ACCESS_AUD: 'abc' };
	const issuer = 'https://beyer.cloudflareaccess.com';

	async function team() {
		const { publicKey, privateKey } = await generateKeyPair('RS256');
		const keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' }] });
		const token = (claims: Record<string, unknown>, audience = 'abc') =>
			new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setIssuer(issuer).setAudience(audience).setExpirationTime('5m').sign(privateKey);
		return { keys, token };
	}

	const ask = (pathname: string, options: { env?: Record<string, unknown>; dev?: boolean; token?: string; keys?: Parameters<typeof decideAccess>[0]['keys'] } = {}) =>
		decideAccess({
			request: new Request(`https://kura.example${pathname}`, { headers: options.token ? { 'Cf-Access-Jwt-Assertion': options.token } : {} }),
			pathname,
			env: options.env,
			dev: options.dev ?? false,
			keys: options.keys
		});

	it('/mcp bleibt zu, solange Access nicht eingerichtet ist; Seiten sind dann offen', async () => {
		expect(await ask('/mcp')).toMatchObject({ allow: false, status: 503 });
		expect(await ask('/mcp', { token: 'x' })).toMatchObject({ allow: false, status: 503 });
		expect(await ask('/papier')).toEqual({ allow: true, identity: null });
	});

	it('verlangt mit eingerichtetem Access überall eine gültige Anmeldung, außer für Download-Links', async () => {
		for (const pathname of ['/', '/papier', '/mcp', '/mcp/', '/d']) expect(await ask(pathname, { env })).toMatchObject({ allow: false, status: 401 });
		expect(await ask('/mcp', { env, token: 'kein.jwt.token' })).toMatchObject({ allow: false, status: 401 });
		expect(await ask(`/d/${'a'.repeat(48)}/blatt.pdf`, { env })).toEqual({ allow: true, identity: null });
	});

	it('öffnet nur den Entwicklungsserver ohne Anmeldung', async () => {
		expect(await ask('/mcp', { dev: true })).toEqual({ allow: true, identity: null });
		expect(await ask('/mcp', { env, dev: true })).toEqual({ allow: true, identity: null });
	});

	it('lässt ein gültiges Token durch und nennt die Person oder das Service Token', async () => {
		const { keys, token } = await team();
		expect(await ask('/mcp', { env, keys, token: await token({ sub: 'u1', email: 'person@example.com' }) })).toEqual({ allow: true, identity: { email: 'person@example.com', subject: 'u1' } });
		expect(await ask('/tag', { env, keys, token: await token({ common_name: 'bot.access' }) })).toEqual({ allow: true, identity: { email: '', subject: 'bot.access' } });
	});

	it('lehnt ein Token für eine andere Anwendung und eines mit fremdem Schlüssel ab', async () => {
		const { keys, token } = await team();
		expect(await ask('/mcp', { env, keys, token: await token({ sub: 'u1' }, 'andere-anwendung') })).toMatchObject({ allow: false, status: 401 });
		const stranger = await team();
		expect(await ask('/mcp', { env, keys, token: await stranger.token({ sub: 'u1' }) })).toMatchObject({ allow: false, status: 401 });
	});
});

describe('MCP-Werkzeuge', () => {
	const font = loadTestFont(KURA.typeface.font, KURA.typeface.weight);

	async function call(method: string, params: unknown, deps: { fontMissing?: boolean } = {}) {
		const { store, entries } = memoryStore();
		const handler = createKuraMcpHandler({ store, origin: 'https://kura.example', loadFont: async () => (deps.fontMissing ? null : font) });
		const response = await handler.fetch(
			new Request('https://kura.example/mcp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
				body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
			})
		);
		const raw = await response.text();
		// Die Antwort kommt als JSON oder als einzelnes Ereignis eines Ereignisstroms
		const body = JSON.parse(raw.startsWith('{') ? raw : (raw.split('\n').find((l) => l.startsWith('data:')) ?? '').slice(5));
		return { result: body.result as { content: { type: string; text?: string; uri?: string; name?: string; mimeType?: string }[]; isError?: boolean }, store, entries };
	}
	const tool = (name: string, args: unknown, deps = {}) => call('tools/call', { name, arguments: args }, deps);

	it('list_products nennt die Produkte mit Feldern und Beispiel', async () => {
		const { result } = await tool('list_products', {});
		const { products } = JSON.parse(result.content[0].text ?? '');
		expect(products.map((p: { id: string }) => p.id)).toEqual(['holzlabel', 'papierlabel', 'tagesuebersicht']);
		expect(products[0]).toMatchObject({ output: 'SVG', example: { text: 'teller' } });
	});

	it('render_product legt die Datei ab und liefert Link, Namen, Typ und Frist', async () => {
		const { result, store } = await tool('render_product', { product: 'holzlabel', content: { text: 'teller' } });
		expect(result.isError).toBeFalsy();
		const made = JSON.parse(result.content[0].text ?? '');
		expect(made).toMatchObject({ created: true, fileName: 'holzlabel-teller-64x24mm.svg', mimeType: 'image/svg+xml', validForHours: 24 });
		expect(made.url).toMatch(/^https:\/\/kura\.example\/d\/[0-9a-f]{48}\/holzlabel-teller-64x24mm\.svg$/);
		expect(result.content[1]).toEqual({ type: 'resource_link', uri: made.url, name: made.fileName, mimeType: made.mimeType });
		const file = await readFile(store, made.url.split('/')[4]);
		expect(file && new TextDecoder().decode(file.body)).toContain('id="schnitt"');
	});

	it('render_product nennt bei einem Verstoß die Hinweise mit Feldpfad und legt nichts ab', async () => {
		const { result, entries } = await tool('render_product', { product: 'papierlabel', content: { labels: [{ text: 'tee' }, { text: 'weihnachtsdekoration' }, {}] } });
		expect(result.isError).toBe(true);
		const answer = JSON.parse(result.content[0].text ?? '');
		expect(answer.created).toBe(false);
		expect(answer.hints).toHaveLength(2);
		expect(answer.hints[0]).toBe('labels[2].text: Das Wort fehlt.');
		expect(answer.hints[1].startsWith('labels[1].text: Das Wort ist')).toBe(true);
		expect(entries.size).toBe(0);
	});

	it('render_product meldet eine fehlende Schrift als Fehler', async () => {
		const { result } = await tool('render_product', { product: 'holzlabel', content: { text: 'teller' } }, { fontMissing: true });
		expect(result.isError).toBe(true);
	});
});
