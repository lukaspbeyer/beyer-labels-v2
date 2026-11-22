/**
 * Produkt Holzlabel: Türlabel aus Lärche im Hausdesign Kura.
 * Unterregeln des Produkts: zwei feste Formate, ein Wort, keine Unterzeile.
 * Alles Gestalterische wird aus Kura abgeleitet.
 */
import { applyCase, maxSignWidth, signCapHeight, type Kura } from '$lib/kura/kura';
import { checkFabrication, formatMm } from '$utils/wood/checks';
import { flattenPath, polylinesBox } from '$utils/wood/geometry';
import type { FabricationWarning, FrontColor, LabelLayout, ViewAngle, WoodSettings } from '$utils/wood/types';

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
