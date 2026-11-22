import { describe, expect, it } from 'vitest';
import { KURA } from '$lib/kura/kura';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { DAY_SHEET_EXAMPLE } from './daySheet';
import { listProducts, makeProduct } from './orders';
import { PRODUCTS } from './registry';

const font = loadTestFont(KURA.typeface.font, KURA.typeface.weight);
const make = (id: string, content: unknown) => makeProduct(KURA, id, content, font);

describe('Bestellbare Produkte', () => {
	it('listet dieselben Produkte wie die Werkbank', () => {
		expect(listProducts().map((p) => p.id)).toEqual(PRODUCTS.map((p) => p.id));
	});

	it.each(listProducts().map((p) => [p.name, p] as const))('%s: das Beispiel aus der Liste ergibt eine Datei', async (_name, spec) => {
		const result = await make(spec.id, spec.example);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value.mime).toBe(spec.output === 'PDF' ? 'application/pdf' : 'image/svg+xml');
	});

	it('Holzlabel: liefert die Laser-SVG und lehnt ein zu breites Wort ab', async () => {
		const file = await make('holzlabel', { text: 'Teller' });
		expect(file.ok && file.value.fileName).toBe('holzlabel-teller-64x24mm.svg');
		expect(file.ok && String(file.value.body)).toContain('id="schnitt"');
		const tooWide = await make('holzlabel', { text: 'servietten' });
		expect(!tooWide.ok && tooWide.error.map((h) => h.kind)).toContain('sign-width');
		expect((await make('holzlabel', { text: 'servietten', format: 'long' })).ok).toBe(true);
	});

	it('Papierlabel: zählt Plätze ab 1 und lehnt Plätze außerhalb des Bogens ab', async () => {
		expect((await make('papierlabel', { text: 'gewürze', position: 8 })).ok).toBe(true);
		const outside = await make('papierlabel', { text: 'gewürze', position: 9 });
		expect(!outside.ok && outside.error.map((h) => h.kind)).toEqual(['position']);
	});

	it('Tagesübersicht: mehrere Tage ergeben ein PDF, Hinweise nennen den Tag', async () => {
		const week = await make('tagesuebersicht', { days: [DAY_SHEET_EXAMPLE, { ...DAY_SHEET_EXAMPLE, date: '2026-11-27' }] });
		expect(week.ok && week.value.fileName).toBe('tagesuebersicht-2026-11-26-bis-2026-11-27.pdf');
		const bad = await make('tagesuebersicht', { days: [DAY_SHEET_EXAMPLE, { date: 'morgen' }] });
		expect(!bad.ok && bad.error[0].message.startsWith('days[1].date')).toBe(true);
	});

	it('nennt bei fehlendem Wort und unbekanntem Produkt, was zu tun ist', async () => {
		const empty = await make('holzlabel', {});
		expect(!empty.ok && empty.error.map((h) => h.kind)).toEqual(['empty']);
		const unknown = await make('kalender', {});
		expect(!unknown.ok && unknown.error[0].message).toContain('holzlabel, papierlabel, tagesuebersicht');
	});
});
