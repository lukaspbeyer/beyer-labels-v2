/** Satz von Haupt- und Unterzeile und Bestimmung der Labelgröße. */
import { calibration } from './calibration';
import type { LoadedFont } from '$lib/typesetting/fonts';
import { setLine } from '$lib/typesetting/line';
import { flattenPath, shapePath, signedDistance, translatePath } from '$lib/typesetting/geometry';
import type { LabelLayout, Point, TextLine, WoodSettings } from './types';

interface LineSpec {
	text: string;
	capHeight: number;
}

export function displayText(text: string, uppercase: boolean): string {
	const trimmed = text.trim();
	return uppercase ? trimmed.toLocaleUpperCase('de-DE') : trimmed;
}

function lineSpecs(settings: WoodSettings): LineSpec[] {
	const main = displayText(settings.text, settings.uppercase);
	const sub = displayText(settings.subText, settings.uppercase);
	const specs: LineSpec[] = [{ text: main, capHeight: settings.capHeight }];
	if (sub) specs.push({ text: sub, capHeight: settings.capHeight * settings.subCapRatio });
	return specs;
}

/** Breite des Randes, den der Text zusätzlich zum Innenabstand freihalten muss. */
export function borderWidth(settings: WoodSettings): number {
	const frame = settings.frame ? calibration.frame.insetMm + calibration.frame.lineWidthMm : 0;
	const rim = settings.process === 'inverse' ? calibration.engraving.inverseRimMm : 0;
	return Math.max(frame, rim);
}

function padding(capHeight: number): { x: number; y: number } {
	const { paddingX, paddingY, minPadding } = calibration.layout;
	return { x: Math.max(minPadding, paddingX * capHeight), y: Math.max(minPadding, paddingY * capHeight) };
}

/** Prüft, ob ein zentrierter Inhaltsblock mit den nötigen Abständen in die Form passt. */
function contentFits(settings: WoodSettings, width: number, height: number, content: { w: number; h: number }, pad: { x: number; y: number }, border: number): boolean {
	const outline = flattenPath(shapePath(settings.shape, width, height, settings.cornerRadius));
	const left = (width - content.w) / 2;
	const top = (height - content.h) / 2;
	const right = left + content.w;
	const bottom = top + content.h;
	const corner = border + Math.min(pad.x, pad.y);
	const checks: { p: Point; need: number }[] = [
		{ p: { x: left, y: height / 2 }, need: border + pad.x },
		{ p: { x: right, y: height / 2 }, need: border + pad.x },
		{ p: { x: width / 2, y: top }, need: border + pad.y },
		{ p: { x: width / 2, y: bottom }, need: border + pad.y },
		...[left, right].flatMap((x) => [top, bottom].map((y) => ({ p: { x, y }, need: corner }))),
		...[0.25, 0.75].flatMap((f) => [top, bottom].map((y) => ({ p: { x: left + f * content.w, y }, need: border + pad.y })))
	];
	return checks.every(({ p, need }) => signedDistance(p, outline) >= need - 1e-6);
}

function autoSize(settings: WoodSettings, content: { w: number; h: number }): { width: number; height: number } {
	const pad = padding(settings.capHeight);
	const border = borderWidth(settings);
	let width = content.w + 2 * (pad.x + border);
	let height = content.h + 2 * (pad.y + border);
	for (let i = 0; i < 400 && !contentFits(settings, width, height, content, pad, border); i++) {
		if (settings.shape === 'oval') {
			width *= 1.02;
			height *= 1.02;
		} else if (settings.shape === 'pill') {
			width += 0.5;
		} else {
			width += 0.5;
			height += 0.5;
		}
	}
	return { width: Math.ceil(width - 1e-6), height: Math.ceil(height - 1e-6) };
}

function clampSize(width: number, height: number): { width: number; height: number; clamped: boolean } {
	const l = calibration.layout;
	const w = Math.min(l.maxWidth, Math.max(l.minWidth, width));
	const h = Math.min(l.maxHeight, Math.max(l.minHeight, height));
	return { width: w, height: h, clamped: width > l.maxWidth || height > l.maxHeight };
}

/** Setzt alle Zeilen, bestimmt die Labelgröße und platziert den Text. */
export function layoutLabel(settings: WoodSettings, font: LoadedFont): LabelLayout {
	const specs = lineSpecs(settings);
	const set = specs.map((s) => setLine(font, s.text, s.capHeight, settings.tracking));

	// Grundlinien untereinander; die erste liegt bei 0, Versalhöhe oberhalb
	const baselines = set.reduce<number[]>((acc, line, i) => {
		if (i === 0) return [0];
		const gap = settings.lineSpacing * settings.capHeight;
		return [...acc, acc[i - 1] + gap + line.capHeight];
	}, []);
	const capTop = -set[0].capHeight;
	const capBottom = baselines[baselines.length - 1];
	const capCenter = (capTop + capBottom) / 2;
	const inkTop = Math.min(...set.map((l, i) => l.ink.minY + baselines[i]));
	const inkBottom = Math.max(...set.map((l, i) => l.ink.maxY + baselines[i]));
	const halfHeight = Math.max(capCenter - inkTop, inkBottom - capCenter, (capBottom - capTop) / 2);
	const contentWidth = Math.max(...set.map((l) => (Number.isFinite(l.ink.maxX) ? l.ink.maxX - l.ink.minX : 0)));

	const requested =
		settings.sizeMode === 'auto'
			? autoSize(settings, { w: contentWidth, h: 2 * halfHeight })
			: { width: settings.width, height: settings.height };
	const { width, height, clamped } = clampSize(requested.width, requested.height);

	const pad = padding(settings.capHeight);
	const border = borderWidth(settings);
	const innerLeft = border + pad.x;
	const innerRight = width - border - pad.x;
	const dy = height / 2 - capCenter;

	const lines: TextLine[] = set.map((line, i) => {
		const inkWidth = line.ink.maxX - line.ink.minX;
		const x =
			settings.align === 'left'
				? innerLeft - line.ink.minX
				: settings.align === 'right'
					? innerRight - line.ink.maxX
					: width / 2 - line.ink.minX - inkWidth / 2;
		return {
			commands: Number.isFinite(inkWidth) ? translatePath(line.commands, x, baselines[i] + dy) : [],
			capHeight: line.capHeight,
			minStroke: line.minStroke
		};
	});

	const { insetMm, lineWidthMm } = calibration.frame;
	return {
		width,
		height,
		outline: shapePath(settings.shape, width, height, settings.cornerRadius),
		frame: settings.frame ? shapePath(settings.shape, width, height, settings.cornerRadius, insetMm + lineWidthMm / 2) : [],
		inverseField:
			settings.process === 'inverse'
				? shapePath(settings.shape, width, height, settings.cornerRadius, calibration.engraving.inverseRimMm)
				: [],
		lines,
		clamped
	};
}
