import { describe, expect, it } from 'vitest';
import { KURA, type Kura } from '$lib/kura/kura';
import { PAPER, paperExample } from '$lib/media/paper/medium';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { err, ok } from '$utils/result';
import { hint, hintText, type Hint } from './hint';
import { defineProduct, record } from './product';

const font = loadTestFont(KURA.typeface.font, KURA.typeface.weight);

/**
 * Ein Produkt nur für diese Tests: Stücke mit einem Wort, die Breite gilt für alle.
 * Lesen meldet ein fehlendes Wort, Setzen ein zu langes; so liegen Hinweise in beiden Schritten.
 */
interface Order {
	width: number;
	words: { word: string }[];
}

function set(_kura: Kura, order: Order) {
	const words = order.words.map(({ word }) => ({ word, hints: word.length > order.width ? [hint('too-long', 'Kürzer fassen.', ['word'])] : ([] as Hint[]) }));
	const fileName = `probe-${words.map((w) => w.word).join('-')}.svg`;
	return { words, fileName, file: async () => ({ fileName, mime: PAPER.mime, body: '%PDF-' }) };
}

const probe = defineProduct({
	id: 'probe',
	name: 'Probe',
	medium: PAPER,
	nav: 'Probe',
	summary: 'Nur für Tests.',
	href: '/probe',
	order: () => ({ description: '', fields: [], example: { word: 'ab' } }),
	pieces: {
		list: 'words',
		limit: ({ width }) => ({ max: width, message: `1 bis ${width} Wörter.` }),
		shared(top) {
			if (top.width === undefined) return ok({ width: 3 });
			return typeof top.width === 'number' && top.width > 0 ? ok({ width: top.width }) : err([hint('width', 'Breite als Zahl angeben.', ['width'])]);
		}
	},
	parse(raw, _shared, top) {
		const entry = record(raw);
		// Ein Wort auf oberster Ebene gilt für jedes Stück ohne eigenes
		const word = typeof entry.word === 'string' ? entry.word : typeof top.fallback === 'string' ? top.fallback : '';
		return word ? { value: { word }, hints: [] } : { value: null, hints: [hint('empty', 'Das Wort fehlt.', ['word'])] };
	},
	set,
	examples: [{ caption: 'zu lang', order: { width: 2, words: [{ word: 'ab' }, { word: 'abc' }] } }],
	// Die Ansicht trägt die Wörter als Breite, damit der Test sieht, dass sie aus dem Satz kommt
	exampleView: (kura, setting) => paperExample(kura, { width: setting.words.length, height: 1, items: [] })
});

const make = (content: unknown) => probe.make(KURA, content, font);
const hintsOf = async (content: unknown) => {
	const made = await make(content);
	return made.ok ? [] : made.error.map(hintText);
};

describe('Produktdefinition: ein oder mehrere Stücke', () => {
	it('nimmt ein einzelnes Stück und eine Liste an und macht daraus eine Datei', async () => {
		const single = await make({ word: 'ab' });
		expect(single.ok && single.value.fileName).toBe('probe-ab.svg');
		const many = await make({ words: [{ word: 'ab' }, { word: 'cd' }] });
		expect(many.ok && many.value.fileName).toBe('probe-ab-cd.svg');
	});

	it('nennt das Stück nur, wenn eine Liste kam, auch bei einer Liste mit einem Stück', async () => {
		expect(await hintsOf({})).toEqual(['word: Das Wort fehlt.']);
		expect(await hintsOf({ word: 'abcd' })).toEqual(['word: Kürzer fassen.']);
		expect(await hintsOf({ words: [{ word: 'abcd' }] })).toEqual(['words[0].word: Kürzer fassen.']);
	});

	it('behält die Stelle im Inhalt, wenn davor ein Stück beim Lesen wegfiel', async () => {
		expect(await hintsOf({ words: [{}, { word: 'ab' }, { word: 'abcd' }] })).toEqual(['words[0].word: Das Wort fehlt.', 'words[2].word: Kürzer fassen.']);
	});

	it('meldet eine leere oder zu lange Liste am Feld der Liste und liest dann kein Stück', async () => {
		expect(await hintsOf({ words: [] })).toEqual(['words: 1 bis 3 Wörter.']);
		expect(await hintsOf({ words: [{}, {}, {}, {}] })).toEqual(['words: 1 bis 3 Wörter.']);
		expect(await hintsOf({ width: 4, words: [{ word: 'a' }, { word: 'b' }, { word: 'c' }, { word: 'd' }] })).toEqual([]);
	});

	it('liest kein Stück, wenn schon das scheitert, was für alle gilt', async () => {
		expect(await hintsOf({ width: 'breit', words: [{}] })).toEqual(['width: Breite als Zahl angeben.']);
	});

	it('gibt jedem Stück die oberste Ebene für Vorgaben mit', async () => {
		expect(await hintsOf({ fallback: 'ab', words: [{}, { word: 'cd' }] })).toEqual([]);
	});

	it('Seiten setzen eine Bestellung ohne Inhalt von außen; Hinweise stehen dann relativ zum Stück', () => {
		const proof = probe.set(KURA, { width: 2, words: [{ word: 'ab' }, { word: 'abc' }] }, font);
		expect(proof.words.map((w) => w.hints.map((h) => h.at))).toEqual([[], [['word']]]);
		expect(proof.hints.map(hintText)).toEqual(['word: Kürzer fassen.']);
	});

	it('setzt Beispiele wie eine Bestellung: Hinweise und Ansicht kommen aus dem Satz', () => {
		const [example] = probe.examples(KURA, font);
		expect(example.hints.map(hintText)).toEqual(['word: Kürzer fassen.']);
		expect(example.view).toMatchObject({ medium: PAPER.id, width: 2, height: 1 });
	});

	it('nennt Agenten Medium und Dateiformat aus dem Medium', () => {
		expect(probe.spec(KURA)).toMatchObject({ medium: 'Papier-Druck', output: 'PDF' });
	});
});
