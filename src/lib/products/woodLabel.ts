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
import { WOOD, woodExample, woodFile } from '$lib/media/wood/medium';
import { DEFAULT_WOOD_SURROUNDINGS } from '$lib/media/wood/surroundings';
import type { LabelLayout, WoodEngraving } from '$lib/media/wood/types';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { fileSlug, formatMm } from '$lib/typesetting/format';
import { hint, type Hint } from './hint';
import { choice, defineProduct, record, type Parsed } from './product';

export const WOOD_LABEL_FORMATS = {
	series: { width: 64, height: 24, name: 'Serie' },
	/** Ausnahme für ein unverzichtbar langes Wort */
	long: { width: 90, height: 24, name: 'Langformat' }
} as const;

export type WoodLabelFormatId = keyof typeof WOOD_LABEL_FORMATS;

export const WOOD_LABEL_FORMAT_IDS = Object.keys(WOOD_LABEL_FORMATS) as WoodLabelFormatId[];
/** Frühere Namen der Formate bleiben für Agenten gültig */
const FORMAT_ALIASES: Record<string, WoodLabelFormatId> = { standard: 'series' };

/** Was am Holzlabel wählbar ist: das Wort und das Format. Wie es in der Vorschau aussieht, hält die Seite selbst. */
export interface WoodLabelInput {
	text: string;
	format: WoodLabelFormatId;
}

export const DEFAULT_WOOD_LABEL_INPUT: WoodLabelInput = { text: 'teller', format: 'series' };

/** Ein oder mehrere Labels für eine Laserdatei, untereinander. */
export interface WoodLabelOrder {
	labels: WoodLabelInput[];
}

/** Leitet die Gravur aus Kura, dem Format und dem Wort ab. */
export function woodLabelEngraving(kura: Kura, input: WoodLabelInput): WoodEngraving {
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
		sizeMode: 'manual',
		width,
		height
	};
}

/**
 * Erst die Regeln von Kura für das Zeichen auf dieser Fläche (Zeichen ohne Glyphe, Breite des Wortes),
 * danach die Fertigungswarnungen des Mediums als Hinweise.
 */
function checkLabel(kura: Kura, font: LoadedFont, input: WoodLabelInput, layout: LabelLayout, engraving: WoodEngraving): Hint[] {
	const surface = { x: 0, y: 0, width: layout.width, height: layout.height };
	const sign = setSign(kura, font, surface, { text: input.text, at: ['text'] }, undefined, { capHeight: engraving.capHeight });
	return [...sign.hints, ...checkFabrication(layout, engraving).map((w) => hint(w.kind, w.message))];
}

/** Liest ein Label; ein Format auf oberster Ebene gilt für jedes Label ohne eigenes. */
function parseLabel(raw: unknown, _shared: unknown, top: Record<string, unknown>): Parsed<WoodLabelInput> {
	const entry = record(raw);
	const hints: Hint[] = [];
	const text = typeof entry.text === 'string' ? entry.text.trim() : '';
	if (!text) hints.push(hint('empty', 'Das Wort fehlt.', ['text']));
	const format = choice(entry.format ?? top.format, WOOD_LABEL_FORMAT_IDS, 'series', 'format', FORMAT_ALIASES);
	if (!format.ok) hints.push(...format.error);
	return { value: text && format.ok ? { ...DEFAULT_WOOD_LABEL_INPUT, text, format: format.value } : null, hints };
}

/** Dateiname nach dem Muster holzlabel-teller-64x24mm.svg; bei mehreren Labels holzlabel-teller-und-2-weitere-64x24mm.svg */
function fileNameOf(first: WoodLabelInput, count: number): string {
	const { width, height } = WOOD_LABEL_FORMATS[first.format];
	return `holzlabel-${fileSlug(first.text)}${count > 1 ? `-und-${count - 1}-weitere` : ''}-${width}x${height}mm.svg`;
}

function set(kura: Kura, order: WoodLabelOrder, font: LoadedFont) {
	const labels = order.labels.map((input) => {
		const engraving = woodLabelEngraving(kura, input);
		const layout = layoutLabel(engraving, font);
		return { layout, engraving, hints: checkLabel(kura, font, input, layout, engraving) };
	});
	const fileName = labels.length > 0 ? fileNameOf(order.labels[0], labels.length) : '';
	const title = `Holzlabel ${labels.map(({ engraving }) => engraving.text.trim()).join(', ')}`;
	return {
		/** Je Label Layout und Gravur, in der Reihenfolge der Bestellung */
		labels,
		fileName,
		file: () => woodFile(labels, fileName, title)
	};
}

/** Wörter des Kura-Wortschatzes, die im Serienformat einen Hinweis auslösen. */
export function vocabularyMisfits(kura: Kura, font: LoadedFont): string[] {
	return VOCABULARY.filter((text) => set(kura, { labels: [{ ...DEFAULT_WOOD_LABEL_INPUT, text }] }, font).labels[0].hints.length > 0);
}

/** Ein Beispiel: ein Label in einem Format, beschriftet mit dem Format, falls nichts anderes gesagt ist. */
function example(input: Partial<WoodLabelInput>, caption?: string): { caption: string; order: WoodLabelOrder } {
	const format = WOOD_LABEL_FORMATS[input.format ?? DEFAULT_WOOD_LABEL_INPUT.format];
	return { caption: caption ?? `${format.name} ${format.width} × ${format.height} mm`, order: { labels: [{ ...DEFAULT_WOOD_LABEL_INPUT, ...input }] } };
}

export const woodLabel = defineProduct({
	id: 'holzlabel',
	name: 'Holzlabel',
	medium: WOOD,
	nav: 'Holz',
	summary: 'Türlabel aus 4 mm Lärche mit einem Wort. Ansehen und als SVG für den Laser laden.',
	href: '/holz',
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
	pieces: {
		list: 'labels',
		limit: () => ({ max: calibration.laserSheet.maxLabels, message: `1 bis ${calibration.laserSheet.maxLabels} Labels je Datei.` })
	},
	parse: parseLabel,
	set,
	examples: [
		example({ text: 'teller' }),
		example({ text: 'duschgel' }, 'längstes Wort des Wortschatzes'),
		example({ text: 'weihnachten', format: 'long' })
	],
	// Je Beispiel ein anderer Holzausschnitt, damit die Reihe nicht gleich aussieht
	exampleView: (_kura, setting, index) => woodExample(setting.labels[0], { ...DEFAULT_WOOD_SURROUNDINGS, grainSeed: index + 1 }),
	notes(kura, font) {
		const misfits = vocabularyMisfits(kura, font);
		return misfits.length > 0 ? [hint('vocabulary', `${misfits.length} Wörter des Wortschatzes passen nicht mehr ins Serienformat: ${misfits.join(', ')}.`)] : [];
	}
});

/** Der Satz eines oder mehrerer Labels mit der Laserdatei */
export type WoodLabelProof = ReturnType<typeof woodLabel.set>;

