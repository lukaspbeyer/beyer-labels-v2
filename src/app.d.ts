// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			/** Die geprüfte Anmeldung über Cloudflare Access; `null`, wo keine verlangt ist */
			identity: import('$lib/server/access').AccessIdentity | null;
		}
		interface Platform {
			/** Bindungen und Variablen des Workers (wrangler.toml) */
			env?: {
				FILES?: import('$lib/server/files').FileStore;
				ASSETS?: { fetch: typeof fetch };
				ACCESS_TEAM_DOMAIN?: string;
				ACCESS_AUD?: string;
			};
		}
	}
}

export {};
