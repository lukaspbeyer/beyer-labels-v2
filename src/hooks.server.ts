import { dev } from '$app/environment';
import { json, type Handle } from '@sveltejs/kit';
import { decideAccess } from '$lib/server/access';

/**
 * Der Worker prüft die Anmeldung selbst, damit eine Lücke in der Access-Konfiguration nichts öffnet.
 * Die Regel steht in `decideAccess`; hier wird sie auf jede Anfrage angewendet.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const gate = await decideAccess({ request: event.request, pathname, env: event.platform?.env, dev });
	if (!gate.allow) return pathname === '/mcp' ? json({ error: gate.message }, { status: gate.status }) : new Response(gate.message, { status: gate.status });
	event.locals.identity = gate.identity;
	return resolve(event);
};
