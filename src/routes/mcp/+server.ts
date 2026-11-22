import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import { KURA } from '$lib/kura/kura';
import { accessConfig, verifyAccess } from '$lib/server/access';
import type { FileStore } from '$lib/server/files';
import { createKuraMcpHandler } from '$lib/server/mcp';
import { createFontLoader, type LoadedFont } from '$lib/typesetting/fonts';
import type { RequestHandler } from './$types';

// Die Schrift bleibt über Anfragen hinweg im Speicher der Instanz
let font: LoadedFont | null = null;

const handle: RequestHandler = async ({ request, platform, fetch, url }) => {
	const env = platform?.env;
	const config = accessConfig(env);
	// Ohne eingerichtetes Access bleibt der Endpunkt zu; nur der Entwicklungsserver ist offen (er hat kein Access vor sich)
	const identity = dev ? null : await verifyAccess(request, config);
	if (identity && !identity.ok) {
		const status = identity.error === 'not-configured' ? 503 : 401;
		return json({ error: identity.error === 'not-configured' ? 'Anmeldung über Cloudflare Access ist nicht eingerichtet.' : 'Nicht angemeldet.' }, { status });
	}
	const store = env?.FILES as FileStore | undefined;
	if (!store) return json({ error: 'Die Dateiablage (KV-Bindung FILES) fehlt.' }, { status: 503 });

	const handler = createKuraMcpHandler({
		store,
		origin: url.origin,
		async loadFont() {
			if (!font) {
				const loaded = await createFontLoader(fetch).load(KURA.typeface.font, KURA.typeface.weight);
				if (loaded.ok) font = loaded.value;
			}
			return font;
		}
	});
	const user = identity?.ok ? identity.value : null;
	return handler.fetch(request, user ? { authInfo: { token: '', clientId: user.subject, scopes: [], extra: { email: user.email } } } : undefined);
};

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
