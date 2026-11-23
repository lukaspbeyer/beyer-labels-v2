import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from '@cantoo/pdf-lib';
import { describe, expect, it } from 'vitest';
import { KURA, parseKura } from '$lib/kura/kura';
import kuraValues from '$lib/kura/kura.json';
import type { PrintPage } from './page';
import { PAPER, paperExample, paperFile, paperPreview } from './medium';

/** Ein Bogen A4 hoch mit einer Fläche oben links und einer feinen Linie */
const page: PrintPage = {
	width: 210,
	height: 297,
	items: [
		{ kind: 'fill', commands: [{ type: 'M', x: 10, y: 10 }, { type: 'L', x: 20, y: 10 }, { type: 'L', x: 20, y: 20 }, { type: 'Z' }] },
		{ kind: 'stroke', commands: [{ type: 'M', x: 10, y: 30 }, { type: 'L', x: 200, y: 30 }], widthMm: 0.25 }
	]
};

/** Die entpackten Inhaltsströme der Seiten eines PDF. */
async function contents(pdf: Uint8Array): Promise<string> {
	const doc = await PDFDocument.load(pdf);
	return doc
		.getPages()
		.flatMap((page) => {
			const streams = page.node.Contents();
			return streams instanceof PDFArray ? streams.asArray().map((ref) => doc.context.lookup(ref)) : [streams];
		})
		.map((stream) => (stream instanceof PDFRawStream ? new TextDecoder().decode(decodePDFRawStream(stream).decode()) : ''))
		.join('\n');
}

function withInk(ink: string) {
	const kura = parseKura({ ...kuraValues, paper: { ...kuraValues.paper, ink } });
	if (!kura.ok) throw new Error(kura.error.join('\n'));
	return kura.value;
}

describe('Papier-Druck', () => {
	it('liefert ein PDF in der Größe der Seiten mit dem Medientyp des Mediums', async () => {
		const file = await paperFile(KURA, [page, { ...page, width: 210, height: 148 }], 'probe.pdf', 'Probe');
		expect(file).toMatchObject({ fileName: 'probe.pdf', mime: PAPER.mime });
		expect([PAPER.output, PAPER.mime]).toEqual(['PDF', 'application/pdf']);
		const text = new TextDecoder('latin1').decode(file.body as Uint8Array);
		expect(text.startsWith('%PDF-')).toBe(true);
		const boxes = [...text.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])].map((v) => Math.round((v / 72) * 25.4)));
		expect(boxes).toEqual([
			[210, 297],
			[210, 148]
		]);
	});

	it('druckt in der Druckfarbe aus Kura', async () => {
		const file = await paperFile(withInk('#ff0000'), [page], 'probe.pdf', 'Probe');
		// Füllung und Linie in reinem Rot
		const drawn = await contents(file.body as Uint8Array);
		expect(drawn).toContain('1 0 0 rg');
		expect(drawn).toContain('1 0 0 RG');
	});

	it('druckt eine Form mit Signalton in der Signalfarbe aus Kura', async () => {
		const signalled: PrintPage = { ...page, items: [{ ...page.items[0], tone: 'signal' }, page.items[1]] };
		const kura = withInk('#000000');
		expect(paperPreview(kura, signalled)).toContain(`fill="${kura.paper.signal}"`);
		expect(paperPreview(kura, signalled)).toContain('stroke="#000000"');
		const drawn = await contents((await paperFile(kura, [signalled], 'probe.pdf', 'Probe')).body as Uint8Array);
		const n = parseInt(kura.paper.signal.slice(1), 16);
		const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
		expect(drawn).toContain(`${channels.join(' ')} rg`);
		expect(drawn).toContain('0 0 0 RG');
	});

	it('zeichnet die Vorschau in mm und in der Druckfarbe aus Kura', () => {
		const svg = paperPreview(withInk('#123456'), page);
		expect(svg).toContain('viewBox="0 0 210 297"');
		expect(svg).toContain('fill="#123456"');
		expect(svg).toContain('stroke="#123456" stroke-width="0.25"');
	});

	it('zeigt ein Beispiel als Ausschnitt der Seite auf Sand', () => {
		const part = { x: 105, y: 74, width: 105, height: 74 };
		expect(paperExample(KURA, page, part)).toMatchObject({ medium: PAPER.id, width: 105, height: 74, backdrop: 'var(--color-sand)' });
		expect(paperExample(KURA, page, part).svg).toContain('viewBox="105 74 105 74"');
		expect(paperExample(KURA, page)).toMatchObject({ width: 210, height: 297 });
	});
});
