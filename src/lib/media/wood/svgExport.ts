/**
 * SVG für die Laser-Software (xTool, LightBurn). 1 Einheit = 1 mm.
 * Ebenen nach Farbe: Gravur schwarz (Fläche), Rahmen blau (Kontur), Schnitt rot (Kontur).
 */
import { KURA_OPTION_NAMES, kuraOptionName, type KuraOption, type KuraOptionValue } from '$lib/kura/kura';
import { calibration } from './calibration';
import { fontInfo } from '$lib/typesetting/fonts';
import { svgPathData, translatePath } from '$lib/typesetting/geometry';
import { displayText } from './layout';
import type { LabelLayout, PathCommand, WoodSettings } from './types';

export const CUT_COLOR = '#FF0000';
export const ENGRAVE_COLOR = '#000000';
export const FRAME_COLOR = '#0000FF';

function escapeXml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatSize(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

function engravingPaths(layout: LabelLayout, settings: WoodSettings): { commands: PathCommand[]; fillRule: 'nonzero' | 'evenodd' } {
	const text = layout.lines.flatMap((l) => l.commands);
	if (settings.process === 'inverse') {
		// Fläche = Gravurfeld ohne Schrift; Glyphen überlappen nicht, daher gerade-ungerade
		return { commands: [...layout.inverseField, ...text], fillRule: 'evenodd' };
	}
	return { commands: text, fillRule: 'nonzero' };
}

/** Ein Auswahlfeld mit seinem Wert, etwa „Oberfläche: Geölt“; Namen aus Kura, wie die Werkbank sie zeigt. */
function named<P extends KuraOption>(path: P, value: KuraOptionValue<P>): string {
	return `${KURA_OPTION_NAMES[path].title}: ${kuraOptionName(path, value)}`;
}

/** Beschreibung für die Laser-Software. */
function description(settings: WoodSettings, layout: LabelLayout): string {
	const treatment = settings.process === 'fill' ? named('wood.fillColor', settings.fillColor) : named('wood.burn', settings.burn);
	return [
		`Lärche ${calibration.label.thicknessMm} mm, ${formatSize(layout.width)} × ${formatSize(layout.height)} mm`,
		`${named('wood.process', settings.process)}, ${named('wood.depth', settings.depth)}, ${treatment}`,
		named('wood.finish', settings.finish),
		`${fontInfo(settings.font).name} ${settings.weight}, Versalhöhe ${formatSize(settings.capHeight)} mm`,
		'Ebenen: schwarz = Gravur (Fläche), blau = Rahmen (Linie), rot = Schnitt (Kontur)'
	].join('. ');
}

export interface SheetLabel {
	layout: LabelLayout;
	settings: WoodSettings;
}

/** Die Laserdatei für ein Label. */
export function buildSvg(layout: LabelLayout, settings: WoodSettings): string {
	return buildSheetSvg([{ layout, settings }]);
}

/**
 * Die Laserdatei für ein oder mehrere Labels. Mehrere stehen untereinander, linksbündig,
 * mit dem Abstand aus der Kalibrierung; die Ebenen bleiben dieselben.
 */
export function buildSheetSvg(labels: readonly SheetLabel[]): string {
	const gap = calibration.laserSheet.gapMm;
	let y = 0;
	const placed = labels.map((label) => {
		const at = y;
		y += label.layout.height + gap;
		return { ...label, y: at };
	});
	const width = Math.max(...labels.map((l) => l.layout.width));
	const height = y - gap;
	const w = formatSize(width).replace(',', '.');
	const h = formatSize(height).replace(',', '.');
	const titles = labels.map(({ settings }) => displayText([settings.text, settings.subText].filter((t) => t.trim()).join(' / '), false));
	const first = labels[0];
	const about =
		labels.length === 1
			? description(first.settings, first.layout)
			: `${labels.length} Labels untereinander, Abstand ${formatSize(gap)} mm. ${description(first.settings, first.layout)}`;
	const parts = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">`,
		`<title>Holzlabel ${escapeXml(titles.join(', '))}</title>`,
		`<desc>${escapeXml(about)}</desc>`
	];
	const engravings = placed.map((l) => ({ ...engravingPaths(l.layout, l.settings), y: l.y })).filter((e) => e.commands.length > 0);
	if (engravings.length > 0) {
		parts.push(
			`<g id="gravur" fill="${ENGRAVE_COLOR}" stroke="none">`,
			...engravings.map((e) => `<path fill-rule="${e.fillRule}" d="${svgPathData(translatePath(e.commands, 0, e.y))}"/>`),
			'</g>'
		);
	}
	const frames = placed.filter((l) => l.layout.frame.length > 0);
	if (frames.length > 0) {
		parts.push(
			`<g id="rahmen" fill="none" stroke="${FRAME_COLOR}" stroke-width="0.1">`,
			...frames.map((l) => `<path d="${svgPathData(translatePath(l.layout.frame, 0, l.y))}"/>`),
			'</g>'
		);
	}
	parts.push(
		`<g id="schnitt" fill="none" stroke="${CUT_COLOR}" stroke-width="0.1">`,
		...placed.map((l) => `<path d="${svgPathData(translatePath(l.layout.outline, 0, l.y))}"/>`),
		'</g>',
		'</svg>'
	);
	return parts.join('\n') + '\n';
}
