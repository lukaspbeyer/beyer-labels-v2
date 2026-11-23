/**
 * Medium Lärche-Gravur: aus den Labels, die ein Produkt gesetzt hat (Layout und Einstellungen je Label),
 * werden die Laserdatei, die Draufsicht als SVG und die Beispielansicht vor der Front.
 * Die räumliche Vorschau (`scene.ts`) lädt nur die Produktseite; die Beispielansicht kommt ohne three.js aus.
 */
import { svgPathData } from '$lib/typesetting/geometry';
import type { ExampleViewBase, Medium, MediumFile } from '../medium';
import { calibration } from './calibration';
import { buildSheetSvg, type SheetLabel } from './svgExport';
import type { LabelLayout, WoodSettings } from './types';

export const WOOD = { id: 'wood', name: 'Lärche-Gravur', output: 'SVG', mime: 'image/svg+xml' } as const satisfies Medium;

/** Ein Label auf seiner Front: beleuchtete Draufsicht aus Layout und Einstellungen, bis das Holz geladen ist die Skizze. */
export interface WoodExampleView extends ExampleViewBase {
	medium: typeof WOOD.id;
	layout: LabelLayout;
	settings: WoodSettings;
	/** Draufsicht als SVG; steht, bis das Holz geladen ist, und bleibt, wenn es nicht lädt */
	sketch: string;
}

/** Die Laserdatei für ein oder mehrere Labels, untereinander. */
export async function woodFile(labels: readonly SheetLabel[], fileName: string): Promise<MediumFile> {
	return { fileName, mime: WOOD.mime, body: buildSheetSvg(labels) };
}

/** Das Beispiel vor der Front aus seinen Einstellungen; die Front gehört zur Umgebung, nicht zur Gestaltung. */
export function woodExample({ layout, settings }: SheetLabel): WoodExampleView {
	return {
		medium: WOOD.id,
		width: layout.width,
		height: layout.height,
		backdrop: calibration.front.color[settings.front],
		layout,
		settings,
		sketch: woodSketch(layout, settings)
	};
}

/**
 * Draufsicht als SVG (1 Einheit = 1 mm): ein Ausschnitt des Lärchenfotos im Ton der Oberfläche, Gravur in ihrer Farbe.
 * Ohne Tiefe und Licht; die fotorealistische Ansicht steht auf der Produktseite.
 */
export function woodSketch(layout: LabelLayout, settings: WoodSettings): string {
	const tone = calibration.previewTone[settings.finish];
	const burn = calibration.engraving.burnColor[settings.burn];
	const ink = settings.process === 'fill' ? calibration.fill.color[settings.fillColor] : settings.process === 'inverse' ? tone : burn;
	const outline = svgPathData(layout.outline);
	const text = svgPathData(layout.lines.flatMap((l) => l.commands));
	// Ausschnitt aus der ersten Lamelle, die das Label fasst; das Wort verschiebt ihn, damit eine Reihe nicht gleich aussieht
	const texture = calibration.woodTexture;
	const horizontal = settings.grain === 'horizontal';
	const along = horizontal ? layout.width : layout.height;
	const across = horizontal ? layout.height : layout.width;
	const acrossPx = across / texture.mmPerPx;
	const lamella = texture.lamellae.find((l) => l[1] - l[0] >= acrossPx + 4) ?? [0, texture.heightPx];
	const seed = Array.from(settings.text).reduce((sum, ch) => (sum * 31 + (ch.codePointAt(0) ?? 0)) % 9973, 7);
	const x = ((seed % 100) / 100) * Math.max(0, texture.widthPx * texture.mmPerPx - along);
	const y = (lamella[0] + 2 + ((seed % 37) / 37) * Math.max(0, lamella[1] - lamella[0] - acrossPx - 4)) * texture.mmPerPx;
	const id = `holz-${seed}-${Math.round(layout.width)}`;
	const image = `<image href="${texture.colorUrl}" x="${-x}" y="${-y}" width="${texture.widthPx * texture.mmPerPx}" height="${texture.heightPx * texture.mmPerPx}" preserveAspectRatio="none"/>`;
	const parts = [
		`<clipPath id="${id}"><path d="${outline}"/></clipPath>`,
		`<path fill="${tone}" d="${outline}"/>`,
		`<g clip-path="url(#${id})">${horizontal ? image : `<g transform="translate(${layout.width} 0) rotate(90)">${image}</g>`}</g>`,
		`<path fill="${tone}" opacity="0.3" style="mix-blend-mode:soft-light" d="${outline}"/>`,
		layout.inverseField.length > 0 ? `<path fill="${burn}" d="${svgPathData(layout.inverseField)}"/>` : '',
		layout.frame.length > 0 ? `<path fill="none" stroke="${burn}" stroke-width="${calibration.frame.lineWidthMm}" d="${svgPathData(layout.frame)}"/>` : '',
		text ? `<path fill="${ink}" d="${text}"/>` : ''
	];
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}">${parts.join('')}</svg>`;
}
