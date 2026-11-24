// PROTOTYP, zum Wegwerfen: setzt das Beispiel im Produkt und in den drei Varianten und meldet Hinweise und Länge.
// Mit KURA_PROTOTYP_OUT=<ordner> schreibt er die Blätter als SVG für den Vergleich.
import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { KURA } from '$lib/kura/kura';
import { paperPreview } from '$lib/media/paper/medium';
import { pathBox } from '$lib/typesetting/geometry';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { DAY_SHEET_EXAMPLE, layoutDaySheet, type DaySheetInput } from './daySheet';
import { DAY_SHEET_VARIANTS } from './daySheetVariants.prototype';

const FULL: DaySheetInput = {
	...DAY_SHEET_EXAMPLE,
	routines: {
		morning: ['Tabletten', 'Frühstück', 'Brotdosen packen', 'Zähne putzen'],
		midday: ['Wasser trinken', 'Wäsche aufhängen', 'Kurz rausgehen', 'Post holen'],
		evening: ['Tasche für morgen', 'Handy laden', 'Küche 10 Minuten', 'Licht aus 22:30']
	},
	tasks: [...DAY_SHEET_EXAMPLE.tasks.slice(0, 2), { text: 'Geschenk für Oma bestellen', minutes: 20 }],
	appointments: [...DAY_SHEET_EXAMPLE.appointments, { time: '17:30', text: 'Elternabend', leaveAt: '17:10' }, { time: '19:00', text: 'Anruf Mama' }],
	remember: ['Versichertenkarte', 'Turnbeutel', 'Schlüssel']
};

it('Varianten der Tagesübersicht', () => {
	const font = loadTestFont(KURA.typeface.font, KURA.typeface.weight);
	const out = process.env.KURA_PROTOTYP_OUT;
	if (out) mkdirSync(out, { recursive: true });
	const all = [{ id: 'heute', name: 'Heute', layout: layoutDaySheet }, ...DAY_SHEET_VARIANTS];
	for (const v of all)
		for (const [label, input] of [['beispiel', DAY_SHEET_EXAMPLE], ['voll', FULL]] as const) {
			const { page, hints } = v.layout(KURA, input, font);
			const end = Math.max(...page.items.map((i) => pathBox(i.commands).maxY));
			console.log(`VARIANTE ${v.id} ${label}: Ende ${end.toFixed(1)} mm, ${hints.length} Hinweise ${JSON.stringify(hints.map((h) => h.message))}`);
			if (out) writeFileSync(`${out}/tag-${v.id}-${label}.svg`, paperPreview(KURA, page));
		}
});
