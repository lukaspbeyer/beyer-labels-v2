/**
 * Prüft die Anmeldung über Cloudflare Access. Access setzt vor jede Anfrage das Token
 * `Cf-Access-Jwt-Assertion` (nach OAuth-Anmeldung ebenso wie für ein Service Token);
 * hier wird es gegen die Schlüssel des Teams und die Kennung der Anwendung geprüft.
 */
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { err, ok, type Result } from '$utils/result';

export interface AccessConfig {
	/** Team-Domain, etwa beyer.cloudflareaccess.com */
	teamDomain: string;
	/** Application Audience (AUD) Tag der Access-Anwendung */
	audience: string;
}

export interface AccessIdentity {
	/** E-Mail der angemeldeten Person; leer bei einem Service Token */
	email: string;
	/** Kennung der Person oder des Service Tokens */
	subject: string;
}

export type AccessError = 'not-configured' | 'missing-token' | 'invalid-token';

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function accessConfig(env: Record<string, unknown> | undefined): AccessConfig | null {
	const teamDomain = typeof env?.ACCESS_TEAM_DOMAIN === 'string' ? env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '') : '';
	const audience = typeof env?.ACCESS_AUD === 'string' ? env.ACCESS_AUD : '';
	return teamDomain && audience ? { teamDomain, audience } : null;
}

/** Die Schlüssel des Teams bei Cloudflare, je Team einmal angelegt. */
function teamKeys(issuer: string): JWTVerifyGetKey {
	let keys = keySets.get(issuer);
	if (!keys) {
		keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
		keySets.set(issuer, keys);
	}
	return keys;
}

/** `keys` ersetzt in Tests die Schlüssel des Teams. */
export async function verifyAccess(request: Request, config: AccessConfig | null, keys?: JWTVerifyGetKey): Promise<Result<AccessIdentity, AccessError>> {
	if (!config) return err('not-configured');
	const token = request.headers.get('Cf-Access-Jwt-Assertion');
	if (!token) return err('missing-token');
	const issuer = `https://${config.teamDomain}`;
	keys ??= teamKeys(issuer);
	try {
		const { payload } = await jwtVerify(token, keys, { issuer, audience: config.audience });
		const subject = typeof payload.sub === 'string' && payload.sub ? payload.sub : typeof payload.common_name === 'string' ? payload.common_name : '';
		return ok({ email: typeof payload.email === 'string' ? payload.email : '', subject });
	} catch {
		return err('invalid-token');
	}
}

/** Wer durch darf: mit der Anmeldung, falls eine geprüft wurde, oder mit dem Grund der Ablehnung. */
export type Gate = { allow: true; identity: AccessIdentity | null } | { allow: false; status: 401 | 503; message: string };

export interface GateInput {
	request: Request;
	pathname: string;
	env: Record<string, unknown> | undefined;
	/** Entwicklungsserver: Er liest die Access-Werte aus wrangler.toml, hat aber kein Access vor sich */
	dev: boolean;
	keys?: JWTVerifyGetKey;
}

/**
 * Die Zugangsregel des Workers an einer Stelle (ADR 0005):
 * - Der Entwicklungsserver ist offen.
 * - Download-Links unter /d/ gehen ohne Anmeldung; sie sind durch ihren Schlüssel geschützt.
 * - /mcp verlangt immer eine gültige Anmeldung und bleibt zu, solange Access nicht eingerichtet ist.
 * - Alle anderen Seiten verlangen die Anmeldung, sobald Access eingerichtet ist.
 */
export async function decideAccess({ request, pathname, env, dev, keys }: GateInput): Promise<Gate> {
	if (dev || pathname.startsWith('/d/')) return { allow: true, identity: null };
	const config = accessConfig(env);
	const strict = pathname === '/mcp';
	if (!config) return strict ? { allow: false, status: 503, message: 'Anmeldung über Cloudflare Access ist nicht eingerichtet.' } : { allow: true, identity: null };
	const identity = await verifyAccess(request, config, keys);
	return identity.ok ? { allow: true, identity: identity.value } : { allow: false, status: 401, message: 'Nicht angemeldet.' };
}
