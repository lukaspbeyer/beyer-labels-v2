/** Länge in mm für Anzeigen und Hinweise: deutsches Komma, ohne überflüssige Nullen. */
export function formatMm(value: number): string {
	return value.toFixed(value < 1 ? 2 : 1).replace(/\.?0+$/, '').replace('.', ',');
}

/** Dateiname-Teil aus einem Wort: klein, Umlaute ausgeschrieben, Akzente entfernt, sonst nur a–z und 0–9. */
export function fileSlug(text: string, fallback = 'label'): string {
	return (
		text
			.trim()
			.toLowerCase()
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe')
			.replace(/ü/g, 'ue')
			.replace(/ß/g, 'ss')
			.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || fallback
	);
}
