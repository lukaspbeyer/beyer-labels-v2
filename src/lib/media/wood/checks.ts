/** Fertigungswarnungen. Grenzwerte in calibration.json (fabrication). */
import { calibration } from './calibration';
import { formatMm } from '$lib/typesetting/format';
import { flattenPath, shapePath, signedDistance } from '$lib/typesetting/geometry';
import type { FabricationWarning, LabelLayout, Point, WoodEngraving } from './types';

function lineName(index: number): string {
	return index === 0 ? 'Hauptzeile' : 'Unterzeile';
}

/** Innerste Begrenzung, die der Text freihalten muss: Kante, Rahmen oder Rand der inversen Gravur. */
function textBoundary(layout: LabelLayout, engraving: WoodEngraving): Point[][] {
	const { insetMm, lineWidthMm } = calibration.frame;
	const frameInset = engraving.frame ? insetMm + lineWidthMm : 0;
	const rimInset = engraving.process === 'inverse' ? calibration.engraving.inverseRimMm : 0;
	const inset = Math.max(frameInset, rimInset);
	return flattenPath(shapePath(engraving.shape, layout.width, layout.height, engraving.cornerRadius, inset));
}

/** Kleinster Abstand der Glyphenkonturen zur Begrenzung, negativ wenn Text herausragt. */
export function textMargin(layout: LabelLayout, engraving: WoodEngraving): number {
	const boundary = textBoundary(layout, engraving);
	const points = layout.lines.flatMap((line) => flattenPath(line.commands, 6).flat());
	if (points.length === 0 || boundary.length === 0) return Infinity;
	return Math.min(...points.map((p) => signedDistance(p, boundary)));
}

export function checkFabrication(layout: LabelLayout, engraving: WoodEngraving): FabricationWarning[] {
	const limits = calibration.fabrication;
	const capWarnings = layout.lines
		.map((line, i) => ({ line, i }))
		.filter(({ line }) => line.commands.length > 0 && line.capHeight < limits.minCapHeightMm)
		.map(({ line, i }): FabricationWarning => ({
			kind: 'cap-height',
			message: `${lineName(i)}: Versalhöhe ${formatMm(line.capHeight)} mm liegt unter ${formatMm(limits.minCapHeightMm)} mm.`
		}));
	const strokeWarnings = layout.lines
		.map((line, i) => ({ line, i }))
		.filter(({ line }) => line.commands.length > 0 && line.minStroke < limits.minStrokeMm)
		.map(({ line, i }): FabricationWarning => ({
			kind: 'stroke',
			message: `${lineName(i)}: dünnster Strich ${formatMm(line.minStroke)} mm liegt unter ${formatMm(limits.minStrokeMm)} mm. Größer oder kräftiger setzen.`
		}));
	const margin = textMargin(layout, engraving);
	const where = engraving.frame ? 'Rahmen' : engraving.process === 'inverse' ? 'Gravurrand' : 'Rand';
	const marginWarnings: FabricationWarning[] =
		margin < 0
			? [{ kind: 'overflow', message: `Der Text ragt über den ${where}. Label vergrößern oder Text verkleinern.` }]
			: margin < limits.minMarginMm
				? [{ kind: 'margin', message: `Abstand zum ${where} nur ${formatMm(margin)} mm, empfohlen sind ${formatMm(limits.minMarginMm)} mm.` }]
				: [];
	const sizeWarnings: FabricationWarning[] = layout.clamped
		? [{ kind: 'size-limit', message: `Der Text braucht mehr als ${calibration.layout.maxWidth} × ${calibration.layout.maxHeight} mm. Versalhöhe oder Text kürzen.` }]
		: [];
	return [...capWarnings, ...strokeWarnings, ...marginWarnings, ...sizeWarnings];
}
