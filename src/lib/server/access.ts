/**
 * Prüft die Anmeldung über Cloudflare Access. Access setzt vor jede Anfrage das Token
 * `Cf-Access-Jwt-Assertion` (nach OAuth-Anmeldung ebenso wie für ein Service Token);
 * hier wird es gegen die Schlüssel des Teams und die Kennung der Anwendung geprüft.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
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

export async function verifyAccess(request: Request, config: AccessConfig | null): Promise<Result<AccessIdentity, AccessError>> {
	if (!config) return err('not-configured');
	const token = request.headers.get('Cf-Access-Jwt-Assertion');
	if (!token) return err('missing-token');
	const issuer = `https://${config.teamDomain}`;
	let keys = keySets.get(issuer);
	if (!keys) {
		keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
		keySets.set(issuer, keys);
	}
	try {
		const { payload } = await jwtVerify(token, keys, { issuer, audience: config.audience });
		const subject = typeof payload.sub === 'string' && payload.sub ? payload.sub : typeof payload.common_name === 'string' ? payload.common_name : '';
		return ok({ email: typeof payload.email === 'string' ? payload.email : '', subject });
	} catch {
		return err('invalid-token');
	}
}
