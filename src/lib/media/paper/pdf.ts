/** PDF-Ausgabe des Mediums Papier-Druck. Läuft im Browser und im Worker. */
import { PDFDocument, rgb } from '@cantoo/pdf-lib';
import type { Kura } from '$lib/kura/kura';
import { svgPathData } from '$lib/typesetting/geometry';
import { toneColor, type PrintPage } from './page';

const PT_PER_MM = 72 / 25.4;

function inkColor(hex: string) {
	const n = parseInt(hex.slice(1), 16);
	return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Erzeugt ein PDF mit einer Seite je `PrintPage`, maßhaltig in mm, in den Farben aus Kura. */
export async function renderPdf(kura: Kura, pages: readonly PrintPage[], title: string): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	doc.setTitle(title);
	doc.setCreator('Kura');
	const colors = { ink: inkColor(toneColor(kura.paper, 'ink')), signal: inkColor(toneColor(kura.paper, 'signal')) };
	for (const page of pages) {
		const sheet = doc.addPage([page.width * PT_PER_MM, page.height * PT_PER_MM]);
		// SVG-Koordinaten (y nach unten) ab der oberen linken Ecke; die Skalierung gilt auch für Strichstärken
		const origin = { x: 0, y: page.height * PT_PER_MM, scale: PT_PER_MM };
		for (const item of page.items) {
			const d = svgPathData(item.commands, 4);
			const color = colors[item.tone ?? 'ink'];
			if (item.kind === 'fill') sheet.drawSvgPath(d, { ...origin, color, borderWidth: 0 });
			else sheet.drawSvgPath(d, { ...origin, borderColor: color, borderWidth: item.widthMm });
		}
	}
	return doc.save();
}
