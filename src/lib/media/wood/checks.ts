/** Fertigungswarnungen. Grenzwerte in calibration.json (fabrication). */
import { calibration } from './calibration';
import { formatMm } from '$lib/typesetting/format';
import { flattenPath, shapePath, signedDistance } from '$lib/typesetting/geometry';
import type { FabricationWarning, LabelLayout, Point, WoodSettings } from './types';

function lineName(index: number): string {
	return index === 0 ? 'Hauptzeile' : 'Unterzeile';
}

/** Innerste Begrenzung, die der Text freihalten muss: Kante, Rahmen oder Rand der inversen Gravur. */
function textBoundary(layout: LabelLayout, settings: WoodSettings): Point[][] {
	const { insetMm, lineWidthMm } = calibration.frame;
	const frameInset = settings.frame ? insetMm + lineWidthMm : 0;
	const rimInset = settings.process === 'inverse' ? calibration.engraving.inverseRimMm : 0;
	const inset = Math.max(frameInset, rimInset);
	return flattenPath(shapePath(settings.shape, layout.width, layout.height, settings.cornerRadius, inset));
}

/** Kleinster Abstand der Glyphenkonturen zur Begrenzung, negativ wenn Text herausragt. */
export function textMargin(layout: LabelLayout, settings: WoodSettings): number {
	const boundary = textBoundary(layout, settings);
	const points = layout.lines.flatMap((line) => flattenPath(line.commands, 6).flat());
	if (points.length === 0 || boundary.length === 0) return Infinity;
	return Math.min(...points.map((p) => signedDistance(p, boundary)));
}

export function checkFabrication(layout: LabelLayout, settings: WoodSettings): FabricationWarning[] {
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
	const margin = textMargin(layout, settings);
	const where = settings.frame ? 'Rahmen' : settings.process === 'inverse' ? 'Gravurrand' : 'Rand';
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
