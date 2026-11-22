/**
 * Produkt Holzlabel: Türlabel aus Lärche im Hausdesign Kura.
 * Unterregeln des Produkts: zwei feste Formate, ein Wort, keine Unterzeile.
 * Alles Gestalterische wird aus Kura abgeleitet.
 */
import { applyCase, maxSignWidth, signCapHeight, type Kura } from '$lib/kura/kura';
import { VOCABULARY } from '$lib/kura/vocabulary';
import { calibration } from '$lib/media/wood/calibration';
import { layoutLabel } from '$lib/media/wood/layout';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { checkFabrication } from '$lib/media/wood/checks';
import { formatMm } from '$lib/typesetting/format';
import { flattenPath, polylinesBox, svgPathData } from '$lib/typesetting/geometry';
import type { FabricationWarning, FrontColor, LabelLayout, ViewAngle, WoodSettings } from '$lib/media/wood/types';

export const WOOD_LABEL_FORMATS = {
	standard: { width: 64, height: 24, name: 'Serie' },
	/** Ausnahme für ein unverzichtbar langes Wort */
	long: { width: 90, height: 24, name: 'Langformat' }
} as const;

export type WoodLabelFormatId = keyof typeof WOOD_LABEL_FORMATS;

/** Was am Holzlabel wählbar ist: Inhalt, Format und die Umgebung der Vorschau. */
export interface WoodLabelInput {
	text: string;
	format: WoodLabelFormatId;
	/** Möbelfront hinter dem Label (nur Vorschau) */
	front: FrontColor;
	/** Startwert für die Wahl des Holzausschnitts */
	grainSeed: number;
	view: ViewAngle;
	lightAngle: number;
}

export const DEFAULT_WOOD_LABEL_INPUT: WoodLabelInput = {
	text: 'teller',
	format: 'standard',
	front: 'agave',
	grainSeed: 1,
	view: 'oblique',
	lightAngle: 125
};

/** Leitet die Einstellungen der Gravur aus Kura und der Eingabe ab. */
export function woodLabelSettings(kura: Kura, input: WoodLabelInput): WoodSettings {
	const { width, height } = WOOD_LABEL_FORMATS[input.format];
	// Die Versalhöhe folgt dem Serienformat, damit das Langformat dieselbe Schrift trägt
	const series = WOOD_LABEL_FORMATS.standard;
	return {
		text: applyCase(kura.sign.case, input.text),
		subText: '',
		uppercase: false,
		font: kura.typeface.font,
		weight: kura.typeface.weight,
		capHeight: signCapHeight(kura, series.width, series.height),
		tracking: kura.sign.trackingPercent,
		subCapRatio: kura.subLine.capRatio,
		lineSpacing: kura.subLine.lineSpacing,
		align: kura.sign.align,
		...kura.wood,
		grainSeed: input.grainSeed,
		sizeMode: 'manual',
		width,
		height,
		front: input.front,
		view: input.view,
		lightAngle: input.lightAngle
	};
}

function signWidth(layout: LabelLayout): number {
	const box = polylinesBox(flattenPath(layout.lines[0]?.commands ?? []));
	return Number.isFinite(box.maxX) ? box.maxX - box.minX : 0;
}

/** Fertigungswarnungen und die Kura-Regel zur Breite des Zeichens. */
export function checkWoodLabel(kura: Kura, layout: LabelLayout, settings: WoodSettings): FabricationWarning[] {
	const limit = maxSignWidth(kura, layout.width);
	const width = signWidth(layout);
	const tooWide: FabricationWarning[] =
		width > limit + 1e-6
			? [{ kind: 'sign-width', message: `Das Wort ist ${formatMm(width)} mm breit, Kura lässt auf diesem Format höchstens ${formatMm(limit)} mm zu. Kürzeres Wort oder Langformat wählen.` }]
			: [];
	return [...tooWide, ...checkFabrication(layout, settings)];
}

/** Wörter des Kura-Wortschatzes, die im Serienformat einen Hinweis auslösen. */
export function vocabularyMisfits(kura: Kura, font: LoadedFont): string[] {
	return VOCABULARY.filter((text) => {
		const settings = woodLabelSettings(kura, { ...DEFAULT_WOOD_LABEL_INPUT, text });
		return checkWoodLabel(kura, layoutLabel(settings, font), settings).length > 0;
	});
}

/** Schematische Draufsicht als SVG (1 Einheit = 1 mm): Holzton, Gravur in ihrer Farbe. */
export function woodLabelSketch(layout: LabelLayout, settings: WoodSettings): string {
	const wood = calibration.previewTone[settings.finish];
	const burn = calibration.engraving.burnColor[settings.burn];
	const ink = settings.process === 'fill' ? calibration.fill.color[settings.fillColor] : settings.process === 'inverse' ? wood : burn;
	const text = svgPathData(layout.lines.flatMap((l) => l.commands));
	const parts = [
		`<path fill="${wood}" d="${svgPathData(layout.outline)}"/>`,
		layout.inverseField.length > 0 ? `<path fill="${burn}" d="${svgPathData(layout.inverseField)}"/>` : '',
		layout.frame.length > 0 ? `<path fill="none" stroke="${burn}" stroke-width="${calibration.frame.lineWidthMm}" d="${svgPathData(layout.frame)}"/>` : '',
		text ? `<path fill="${ink}" d="${text}"/>` : ''
	];
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}">${parts.join('')}</svg>`;
}
