import { error } from '@sveltejs/kit';
import { readFile } from '$lib/server/files';
import type { RequestHandler } from './$types';

/** Abruf einer erzeugten Datei über ihren nicht erratbaren Schlüssel; ohne Anmeldung, 24 Stunden lang. */
export const GET: RequestHandler = async ({ params, platform }) => {
	const store = platform?.env?.FILES;
	const file = store ? await readFile(store, params.key) : null;
	if (!file) error(404, 'Diese Datei gibt es nicht oder nicht mehr.');
	return new Response(file.body, {
		headers: {
			'Content-Type': file.mime,
			'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
			'Cache-Control': 'private, no-store',
			'X-Robots-Tag': 'noindex'
		}
	});
};
