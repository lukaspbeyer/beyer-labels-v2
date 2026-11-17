/**
 * SVG für die Laser-Software (xTool, LightBurn). 1 Einheit = 1 mm.
 * Ebenen nach Farbe: Gravur schwarz (Fläche), Rahmen blau (Kontur), Schnitt rot (Kontur).
 */
import { calibration } from './calibration';
import { fontInfo } from './fonts';
import { svgPathData } from './geometry';
import { displayText } from './layout';
import type { LabelLayout, PathCommand, WoodSettings } from './types';

export const CUT_COLOR = '#FF0000';
export const ENGRAVE_COLOR = '#000000';
export const FRAME_COLOR = '#0000FF';

const PROCESS_NAMES = { dark: 'Dunkle Gravur', inverse: 'Inverse Gravur', fill: 'Farbfüllung' } as const;
const LEVEL_NAMES = { low: 'flach', medium: 'mittel', high: 'tief' } as const;
const BURN_NAMES = { low: 'hell', medium: 'mittel', high: 'dunkel' } as const;
const FILL_NAMES = { black: 'Schwarz', white: 'Weiß', anthracite: 'Anthrazit' } as const;
const FINISH_NAMES = { raw: 'roh', oiled: 'geölt', lacquer: 'Lack matt', limed: 'weiß gekalkt' } as const;

function escapeXml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatSize(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

/** Dateiname nach dem Muster holzlabel-teller-80x30mm.svg */
export function exportFileName(settings: WoodSettings, layout: LabelLayout): string {
	const slug =
		settings.text
			.trim()
			.toLowerCase()
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe')
			.replace(/ü/g, 'ue')
			.replace(/ß/g, 'ss')
			.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'label';
	const size = `${formatSize(layout.width).replace(',', '-')}x${formatSize(layout.height).replace(',', '-')}`;
	return `holzlabel-${slug}-${size}mm.svg`;
}

function engravingPaths(layout: LabelLayout, settings: WoodSettings): { commands: PathCommand[]; fillRule: 'nonzero' | 'evenodd' } {
	const text = layout.lines.flatMap((l) => l.commands);
	if (settings.process === 'inverse') {
		// Fläche = Gravurfeld ohne Schrift; Glyphen überlappen nicht, daher gerade-ungerade
		return { commands: [...layout.inverseField, ...text], fillRule: 'evenodd' };
	}
	return { commands: text, fillRule: 'nonzero' };
}

function description(settings: WoodSettings, layout: LabelLayout): string {
	const process = PROCESS_NAMES[settings.process];
	const treatment =
		settings.process === 'fill'
			? `Füllfarbe ${FILL_NAMES[settings.fillColor]}`
			: `Brennfarbe ${BURN_NAMES[settings.burn]}`;
	return [
		`Lärche ${calibration.label.thicknessMm} mm, ${formatSize(layout.width)} × ${formatSize(layout.height)} mm`,
		`${process}, Tiefe ${LEVEL_NAMES[settings.depth]}, ${treatment}`,
		`Oberfläche ${FINISH_NAMES[settings.finish]}`,
		`${fontInfo(settings.font).name} ${settings.weight}, Versalhöhe ${formatSize(settings.capHeight)} mm`,
		'Ebenen: schwarz = Gravur (Fläche), blau = Rahmen (Linie), rot = Schnitt (Kontur)'
	].join('. ');
}

export function buildSvg(layout: LabelLayout, settings: WoodSettings): string {
	const w = formatSize(layout.width).replace(',', '.');
	const h = formatSize(layout.height).replace(',', '.');
	const engraving = engravingPaths(layout, settings);
	const title = displayText([settings.text, settings.subText].filter((t) => t.trim()).join(' / '), false);
	const parts = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">`,
		`<title>Holzlabel ${escapeXml(title)}</title>`,
		`<desc>${escapeXml(description(settings, layout))}</desc>`
	];
	if (engraving.commands.length > 0) {
		parts.push(
			`<g id="gravur" fill="${ENGRAVE_COLOR}" stroke="none">`,
			`<path fill-rule="${engraving.fillRule}" d="${svgPathData(engraving.commands)}"/>`,
			'</g>'
		);
	}
	if (layout.frame.length > 0) {
		parts.push(
			`<g id="rahmen" fill="none" stroke="${FRAME_COLOR}" stroke-width="0.1">`,
			`<path d="${svgPathData(layout.frame)}"/>`,
			'</g>'
		);
	}
	parts.push(
		`<g id="schnitt" fill="none" stroke="${CUT_COLOR}" stroke-width="0.1">`,
		`<path d="${svgPathData(layout.outline)}"/>`,
		'</g>',
		'</svg>'
	);
	return parts.join('\n') + '\n';
}
