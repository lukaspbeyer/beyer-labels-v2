/** Länge in mm für Anzeigen und Hinweise: deutsches Komma, ohne überflüssige Nullen. */
export function formatMm(value: number): string {
	return value.toFixed(value < 1 ? 2 : 1).replace(/\.?0+$/, '').replace('.', ',');
}
