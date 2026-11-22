/** PDF-Ausgabe des Mediums Papier-Druck. Läuft im Browser und im Worker. */
import { PDFDocument, rgb } from '@cantoo/pdf-lib';
import { svgPathData } from '$lib/typesetting/geometry';
import { tonedInk, type PrintPage } from './page';

const PT_PER_MM = 72 / 25.4;


/** Erzeugt ein PDF mit einer Seite je `PrintPage`, maßhaltig in mm. */
export async function renderPdf(pages: readonly PrintPage[], ink: string, title: string): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	doc.setTitle(title);
	doc.setCreator('Kura');
	for (const page of pages) {
		const sheet = doc.addPage([page.width * PT_PER_MM, page.height * PT_PER_MM]);
		// SVG-Koordinaten (y nach unten) ab der oberen linken Ecke; die Skalierung gilt auch für Strichstärken
		const origin = { x: 0, y: page.height * PT_PER_MM, scale: PT_PER_MM };
		for (const item of page.items) {
			const d = svgPathData(item.commands, 4);
			const color = rgb(...tonedInk(ink, item.tone));
			if (item.kind === 'fill') sheet.drawSvgPath(d, { ...origin, color, borderWidth: 0 });
			else sheet.drawSvgPath(d, { ...origin, borderColor: color, borderWidth: item.widthMm });
		}
	}
	return doc.save();
}
