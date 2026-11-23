import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import { KURA } from '$lib/kura/kura';
import { loadKuraFont } from '$lib/server/font';
import { createKuraMcpHandler } from '$lib/server/mcp';
import type { RequestHandler } from './$types';

/** Der Zugang ist in hooks.server.ts schon geprüft (`decideAccess`); hier werden nur Ablage und Schrift angeschlossen. */
const handle: RequestHandler = async ({ request, platform, fetch, url, locals }) => {
	// Zweite Sicherung: Außerhalb des Entwicklungsservers geht hier nichts ohne geprüfte Anmeldung durch
	if (!dev && !locals.identity) return json({ error: 'Nicht angemeldet.' }, { status: 401 });
	const env = platform?.env;
	const store = env?.FILES;
	if (!store) return json({ error: 'Die Dateiablage (KV-Bindung FILES) fehlt.' }, { status: 503 });

	const handler = createKuraMcpHandler({
		store,
		origin: url.origin,
		loadFont: () => loadKuraFont(KURA, { assets: dev ? undefined : env?.ASSETS, fetch, origin: url.origin })
	});
	const user = locals.identity;
	return handler.fetch(request, user ? { authInfo: { token: '', clientId: user.subject, scopes: [], extra: { email: user.email } } } : undefined);
};

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
