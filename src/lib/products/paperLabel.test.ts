import { describe, expect, it } from 'vitest';
import { KURA } from '$lib/kura/kura';
import { pageSvg } from '$lib/media/paper/page';
import { renderPdf } from '$lib/media/paper/pdf';
import { pathBox } from '$lib/typesetting/geometry';
import { loadTestFont } from '$lib/typesetting/testFonts';
import { DEFAULT_PAPER_LABEL_INPUT, paperLabel, placeOf, positionAt, type PaperLabelInput } from './paperLabel';

const font = loadTestFont(KURA.typeface.font, KURA.typeface.weight);

function label(input: Partial<PaperLabelInput>) {
	const { format, ...rest } = { ...DEFAULT_PAPER_LABEL_INPUT, ...input };
	const proof = paperLabel.set(KURA, { format, labels: [rest] }, font);
	return { layout: proof.labels[0].layout, hints: proof.hints, page: proof.page, proof };
}

describe('Papierlabel', () => {
	it('leitet die Versalhöhe je Format aus Kura ab', () => {
		expect(label({ format: 'label' }).layout.lines[0].capHeight).toBeCloseTo(9.84, 2);
		expect(label({ format: 'sign' }).layout.lines[0].capHeight).toBeCloseTo(19.69, 2);
	});

	it('setzt das Wort klein und mittig ins Etikett', () => {
		const { layout } = label({ text: 'Gewürze' });
		const box = pathBox(layout.lines[0].commands);
		expect((box.minX + box.maxX) / 2).toBeCloseTo(105 / 2, 3);
		// ohne Unterzeile steht die Versalhöhe senkrecht mittig
		expect(box.maxY).toBeGreaterThan(74 / 2);
		expect(box.minY).toBeLessThan(74 / 2);
		expect(layout.lines).toHaveLength(1);
	});

	it('setzt die Unterzeile kleiner darunter', () => {
		const { layout } = label({ subText: 'Regal 2' });
		expect(layout.lines).toHaveLength(2);
		expect(layout.lines[1].capHeight).toBeCloseTo(layout.lines[0].capHeight * 0.55, 6);
		expect(pathBox(layout.lines[1].commands).minY).toBeGreaterThan(pathBox(layout.lines[0].commands).minY);
	});

	it('stellt das Etikett an seinen Platz auf dem Bogen', () => {
		const first = pathBox(label({ position: 0 }).page.items[0].commands);
		const sixth = pathBox(label({ position: 5 }).page.items[0].commands);
		expect(sixth.minX - first.minX).toBeCloseTo(105, 6);
		expect(sixth.minY - first.minY).toBeCloseTo(2 * 74, 6);
		expect(label({ format: 'sign' }).page).toMatchObject({ width: 210, height: 148 });
	});

	it('rechnet Spalte und Zeile in den Platz um und zurück', () => {
		expect(positionAt('label', 1, 2)).toBe(2);
		expect(placeOf('label', 2)).toEqual({ column: 1, row: 2 });
		expect(positionAt('label', 3, 1)).toBeNull();
		expect(positionAt('sign', 1, 1)).toBe(0);
	});

	it('setzt mehrere Etiketten auf einen Bogen, die freien Plätze bleiben leer', () => {
		const { page } = paperLabel.set(KURA, { format: 'label', labels: [{ text: 'tee', subText: '', position: 0 }, { text: 'tee', subText: '', position: 7 }] }, font);
		expect(page.items).toHaveLength(2);
		const [a, b] = page.items.map((item) => pathBox(item.commands));
		expect(b.minX - a.minX).toBeCloseTo(105, 6);
		expect(b.minY - a.minY).toBeCloseTo(3 * 74, 6);
	});

	it('meldet ein zu breites Wort und eine zu breite Unterzeile', () => {
		expect(label({ text: 'gewürze' }).hints).toEqual([]);
		expect(label({ text: 'weihnachtsdekoration' }).hints.map((h) => h.kind)).toEqual(['sign-width']);
		expect(label({ subText: 'eine viel zu lange unterzeile für dieses etikett' }).hints.map((h) => h.kind)).toEqual(['sub-width']);
	});

	it('benennt die Datei nach Wort und Format', () => {
		expect(label({ text: 'Gewürze' }).proof.fileName).toBe('papierlabel-gewuerze-105x74mm.pdf');
		expect(label({ text: 'Café' }).proof.fileName).toBe('papierlabel-cafe-105x74mm.pdf');
	});

	it('vergibt freie Plätze der Reihe nach um die genannten herum', () => {
		const labels = [{ text: 'tee' }, { text: 'kaffee', position: 0 }, { text: 'müsli', position: 1 }, { text: 'reis' }].map((l) => ({ subText: '', ...l }));
		expect(paperLabel.set(KURA, { format: 'label', labels }, font).labels.map((l) => l.position)).toEqual([2, 0, 1, 3]);
	});

	it('nennt bei einem doppelt genannten Platz und einer Unterzeile ohne Text das Etikett', async () => {
		const made = await paperLabel.make(KURA, { labels: [{ text: 'tee', position: 3 }, { text: 'kaffee', column: 1, row: 2, subText: 7 }] }, font);
		expect(!made.ok && made.error.map((h) => [h.kind, h.at])).toEqual([
			['type', ['labels', 1, 'subText']],
			['position', ['labels', 1]]
		]);
	});
});

describe('Papier-Druck', () => {
	it('schreibt ein PDF in der Größe des Bogens', async () => {
		const pdf = await renderPdf([label({}).page], KURA.paper.ink, 'gewürze');
		const text = new TextDecoder('latin1').decode(pdf);
		expect(text.startsWith('%PDF-')).toBe(true);
		const box = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(text);
		expect(box && [Number(box[1]), Number(box[2])].map((v) => Math.round((v / 72) * 25.4))).toEqual([210, 297]);
	});

	it('zeichnet die Vorschau in mm', () => {
		expect(pageSvg(label({}).page, '#000000')).toContain('viewBox="0 0 210 297"');
	});
});
