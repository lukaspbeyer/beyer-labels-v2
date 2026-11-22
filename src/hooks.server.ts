import type { Handle } from '@sveltejs/kit';
import { accessConfig, verifyAccess } from '$lib/server/access';

/**
 * Ist Cloudflare Access eingerichtet, verlangt auch der Worker selbst eine gültige Anmeldung,
 * damit eine Lücke in der Access-Konfiguration die Seiten nicht öffnet. Ausgenommen sind die
 * Download-Links unter /d/: Sie sind durch ihren Schlüssel geschützt und sollen ohne Anmeldung gehen.
 * /mcp prüft selbst und bleibt auch ohne eingerichtetes Access zu.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const config = accessConfig(event.platform?.env);
	const open = event.url.pathname.startsWith('/d/') || event.url.pathname === '/mcp';
	if (config && !open) {
		const identity = await verifyAccess(event.request, config);
		if (!identity.ok) return new Response('Nicht angemeldet.', { status: 401 });
	}
	return resolve(event);
};
