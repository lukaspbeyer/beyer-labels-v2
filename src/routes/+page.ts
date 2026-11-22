import { redirect } from '@sveltejs/kit';

/** Bis die Kura-Werkbank steht, führt die Startseite zum Holzlabel. */
export function load(): never {
	redirect(307, '/holz');
}
