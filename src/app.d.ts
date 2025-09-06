// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			// Cloudflare Workers bindings exposed on platform.env
			env?: {
				OPENAI_API_KEY?: string;
				// Add other bindings here as needed, or widen to Record<string, unknown>
				[key: string]: unknown;
			};
			// Optionally, include Cloudflare request properties if needed
			// cf?: import('@cloudflare/workers-types').IncomingRequestCfProperties;
		}
	}
}

export {};
