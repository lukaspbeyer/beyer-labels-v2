/**
 * Produkt Holzlabel: Türlabel aus Lärche im Hausdesign Kura.
 * Unterregeln des Produkts: zwei feste Formate, ein Wort, keine Unterzeile.
 * Alles Gestalterische wird aus Kura abgeleitet.
 */
import { caseInWords, maxSignWidth, signCapHeight, type Kura } from '$lib/kura/kura';
import { roleText, setSign } from '$lib/kura/textRole';
import { VOCABULARY } from '$lib/kura/vocabulary';
import { calibration } from '$lib/media/wood/calibration';
import { checkFabrication } from '$lib/media/wood/checks';
import { layoutLabel } from '$lib/media/wood/layout';
import { buildSheetSvg, exportFileName } from '$lib/media/wood/svgExport';
import type { FrontColor, LabelLayout, ViewAngle, WoodSettings } from '$lib/media/wood/types';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { formatMm } from '$lib/typesetting/format';
import { svgPathData } from '$lib/typesetting/geometry';
import { hint, within, type Hint } from './hint';
import { choice, defineProduct, record, type Parsed, type ProductExample, type Proof } from './product';

export const WOOD_LABEL_FORMATS = {
	series: { width: 64, height: 24, name: 'Serie' },
	/** Ausnahme für ein unverzichtbar langes Wort */
	long: { width: 90, height: 24, name: 'Langformat' }
} as const;

export type WoodLabelFormatId = keyof typeof WOOD_LABEL_FORMATS;

export const WOOD_LABEL_FORMAT_IDS = Object.keys(WOOD_LABEL_FORMATS) as WoodLabelFormatId[];
/** Frühere Namen der Formate bleiben für Agenten gültig */
const FORMAT_ALIASES: Record<string, WoodLabelFormatId> = { standard: 'series' };

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
	format: 'series',
	front: 'agave',
	grainSeed: 1,
	view: 'oblique',
	lightAngle: 125
};

/** Ein oder mehrere Labels für eine Laserdatei. `many`: Der Inhalt kam als Liste `labels`; Hinweise nennen dann das Label. */
export interface WoodLabelOrder {
	many: boolean;
	/** `index`: Stelle des Labels im Inhalt, falls sie nicht die Stelle in dieser Liste ist */
	labels: (WoodLabelInput & { index?: number })[];
}

export interface WoodLabelProof extends Proof {
	/** Je Label Layout und Einstellungen der Gravur, in der Reihenfolge des Inhalts */
	labels: { layout: LabelLayout; settings: WoodSettings; hints: Hint[] }[];
}

/** Leitet die Einstellungen der Gravur aus Kura und der Eingabe ab. */
export function woodLabelSettings(kura: Kura, input: WoodLabelInput): WoodSettings {
	const { width, height } = WOOD_LABEL_FORMATS[input.format];
	// Die Versalhöhe folgt dem Serienformat, damit das Langformat dieselbe Schrift trägt
	const series = WOOD_LABEL_FORMATS.series;
	return {
		text: roleText(kura, 'sign', input.text),
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

/**
 * Erst die Regeln von Kura für das Zeichen auf dieser Fläche (Zeichen ohne Glyphe, Breite des Wortes),
 * danach die Fertigungswarnungen des Mediums als Hinweise.
 */
function checkLabel(kura: Kura, font: LoadedFont, input: WoodLabelInput, layout: LabelLayout, settings: WoodSettings): Hint[] {
	const surface = { x: 0, y: 0, width: layout.width, height: layout.height };
	const sign = setSign(kura, font, surface, { text: input.text, at: ['text'] }, undefined, { capHeight: settings.capHeight });
	return [...sign.hints, ...checkFabrication(layout, settings).map((w) => hint(w.kind, w.message))];
}

function parse(raw: unknown): Parsed<WoodLabelOrder> {
	const source = record(raw);
	const many = Array.isArray(source.labels);
	const entries = many ? (source.labels as unknown[]).map(record) : [source];
	const limit = calibration.laserSheet.maxLabels;
	if (entries.length === 0 || entries.length > limit) return { order: null, hints: [hint('too-many', `1 bis ${limit} Labels je Datei.`, ['labels'])] };
	const hints: Hint[] = [];
	const labels = entries.flatMap((entry, index) => {
		const here = (found: Hint[]) => hints.push(...(many ? within(['labels', index], found) : found));
		const text = typeof entry.text === 'string' ? entry.text.trim() : '';
		if (!text) here([hint('empty', 'Das Wort fehlt.', ['text'])]);
		const format = choice(entry.format ?? source.format, WOOD_LABEL_FORMAT_IDS, 'series', 'format', FORMAT_ALIASES);
		if (!format.ok) here(format.error);
		return text && format.ok ? [{ ...DEFAULT_WOOD_LABEL_INPUT, text, format: format.value, index }] : [];
	});
	return { order: labels.length > 0 ? { many, labels } : null, hints };
}

function set(kura: Kura, order: WoodLabelOrder, font: LoadedFont): WoodLabelProof {
	const labels = order.labels.map((input, i) => {
		const settings = woodLabelSettings(kura, input);
		const layout = layoutLabel(settings, font);
		const found = checkLabel(kura, font, input, layout, settings);
		return { layout, settings, hints: order.many ? within(['labels', input.index ?? i], found) : found };
	});
	const fileName = labels.length > 0 ? exportFileName(labels[0].settings, labels[0].layout, labels.length) : '';
	return {
		labels,
		hints: labels.flatMap((l) => l.hints),
		fileName,
		file: async () => ({ fileName, mime: 'image/svg+xml', body: buildSheetSvg(labels) })
	};
}

/** Wörter des Kura-Wortschatzes, die im Serienformat einen Hinweis auslösen. */
export function vocabularyMisfits(kura: Kura, font: LoadedFont): string[] {
	return VOCABULARY.filter((text) => set(kura, { many: false, labels: [{ ...DEFAULT_WOOD_LABEL_INPUT, text }] }, font).hints.length > 0);
}

function example(kura: Kura, font: LoadedFont, input: Partial<WoodLabelInput>, caption?: string): ProductExample {
	const [label] = set(kura, { many: false, labels: [{ ...DEFAULT_WOOD_LABEL_INPUT, ...input }] }, font).labels;
	const { layout, settings, hints } = label;
	const format = WOOD_LABEL_FORMATS[input.format ?? 'series'];
	return {
		caption: caption ?? `${format.name} ${format.width} × ${format.height} mm`,
		svg: woodLabelSketch(layout, settings),
		width: layout.width,
		height: layout.height,
		hints,
		backdrop: calibration.front.color.agave,
		wood: { layout, settings }
	};
}

export const woodLabel = defineProduct({
	id: 'holzlabel',
	name: 'Holzlabel',
	medium: 'Lärche-Gravur',
	nav: 'Holz',
	summary: 'Türlabel aus 4 mm Lärche mit einem Wort. Ansehen und als SVG für den Laser laden.',
	href: '/holz',
	output: 'SVG',
	order(kura) {
		const { series, long } = WOOD_LABEL_FORMATS;
		const size = (f: { width: number; height: number }) => `${f.width} × ${f.height} mm`;
		return {
			description:
				`Türlabel aus ${calibration.label.thicknessMm} mm Lärche für den Laser. Je Label ein einzelnes kurzes Wort; Kura schreibt es ${caseInWords(kura.sign.case)}. Die SVG enthält die Ebenen Gravur (schwarz) und Schnitt (rot), 1 Einheit = 1 mm. ` +
				`Für mehrere Labels in einer Datei statt text { "labels": [ { "text": … }, … ] } senden, höchstens ${calibration.laserSheet.maxLabels}; sie stehen untereinander mit ${calibration.laserSheet.gapMm} mm Abstand.`,
			fields: [
				{ name: 'text', type: 'string', required: true, description: `Ein kurzes Wort, im Serienformat höchstens ${formatMm(maxSignWidth(kura, series.width))} mm breit, im Langformat ${formatMm(maxSignWidth(kura, long.width))} mm.` },
				{
					name: 'format',
					type: WOOD_LABEL_FORMAT_IDS.map((id) => `"${id}"`).join(' | '),
					required: false,
					description: `series = Serienformat ${size(series)} (Vorgabe), long = Langformat ${size(long)} nur für ein unverzichtbar langes Wort.`
				},
				{ name: 'labels', type: '{ text, format? }[]', required: false, description: 'Mehrere Labels in einer Datei; ersetzt text auf oberster Ebene. format auf oberster Ebene gilt für jedes Label ohne eigenes format.' }
			],
			example: { text: 'teller' }
		};
	},
	parse,
	set,
	examples: (kura, font) => [
		example(kura, font, { text: 'teller' }),
		example(kura, font, { text: 'duschgel', grainSeed: 2 }, 'längstes Wort des Wortschatzes'),
		example(kura, font, { text: 'servietten', format: 'long', grainSeed: 3 })
	],
	notes(kura, font) {
		const misfits = vocabularyMisfits(kura, font);
		return misfits.length > 0 ? [hint('vocabulary', `${misfits.length} Wörter des Wortschatzes passen nicht mehr ins Serienformat: ${misfits.join(', ')}.`)] : [];
	}
});

/**
 * Draufsicht als SVG (1 Einheit = 1 mm): ein Ausschnitt des Lärchenfotos im Ton der Oberfläche, Gravur in ihrer Farbe.
 * Ohne Tiefe und Licht; die fotorealistische Ansicht steht auf der Produktseite.
 */
export function woodLabelSketch(layout: LabelLayout, settings: WoodSettings): string {
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
