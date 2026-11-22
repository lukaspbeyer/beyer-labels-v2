import { describe, expect, it } from 'vitest';
import { KURA } from '$lib/kura/kura';
import { pageSvg } from '$lib/media/paper/page';
import { renderPdf } from '$lib/media/paper/pdf';
import { pathBox } from '$lib/typesetting/geometry';
import { loadTestFont } from '$lib/typesetting/testFonts';
import {
	checkPaperLabel,
	DEFAULT_PAPER_LABEL_INPUT,
	layoutPaperLabel,
	paperLabelFileName,
	paperLabelPage,
	type PaperLabelInput
} from './paperLabel';

const font = loadTestFont(KURA.typeface.font, KURA.typeface.weight);

function label(input: Partial<PaperLabelInput>) {
	const full = { ...DEFAULT_PAPER_LABEL_INPUT, ...input };
	const layout = layoutPaperLabel(KURA, full, font);
	return { layout, hints: checkPaperLabel(KURA, layout), page: paperLabelPage(layout, full.position) };
}

describe('Papierlabel', () => {
	it('leitet die Versalhöhe je Format aus Kura ab', () => {
		expect(label({ format: 'small' }).layout.lines[0].capHeight).toBeCloseTo(9.84, 2);
		expect(label({ format: 'large' }).layout.lines[0].capHeight).toBeCloseTo(19.69, 2);
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
		expect(label({ format: 'large' }).page).toMatchObject({ width: 210, height: 148 });
	});

	it('meldet ein zu breites Wort und eine zu breite Unterzeile', () => {
		expect(label({ text: 'gewürze' }).hints).toEqual([]);
		expect(label({ text: 'weihnachtsdekoration' }).hints.map((h) => h.kind)).toEqual(['sign-width']);
		expect(label({ subText: 'eine viel zu lange unterzeile für dieses etikett' }).hints.map((h) => h.kind)).toEqual(['sub-width']);
	});

	it('benennt die Datei nach Wort und Format', () => {
		expect(paperLabelFileName({ ...DEFAULT_PAPER_LABEL_INPUT, text: 'Gewürze' })).toBe('papierlabel-gewuerze-105x74mm.pdf');
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
