/** Schriftkatalog, Laden der lokalen Schriftdateien und Messung der Strichstärke. */
import { parse, type Font, type Glyph } from 'opentype.js';
import { err, ok, type Result } from '$utils/result';
import { flattenPath } from './geometry';
import type { FontId, FontWeight, Point } from './types';

export interface FontInfo {
	id: FontId;
	name: string;
	/** CSS-Familienname der @font-face-Regeln in holz.css */
	cssFamily: string;
}

export const FONT_CATALOG: readonly FontInfo[] = [
	{ id: 'sora', name: 'Sora', cssFamily: 'holz-sora' },
	{ id: 'noto-sans', name: 'Noto Sans', cssFamily: 'holz-noto-sans' },
	{ id: 'manrope', name: 'Manrope', cssFamily: 'holz-manrope' },
	{ id: 'outfit', name: 'Outfit', cssFamily: 'holz-outfit' },
	{ id: 'jost', name: 'Jost', cssFamily: 'holz-jost' },
	{ id: 'dm-sans', name: 'DM Sans', cssFamily: 'holz-dm-sans' },
	{ id: 'lexend', name: 'Lexend', cssFamily: 'holz-lexend' },
	{ id: 'space-grotesk', name: 'Space Grotesk', cssFamily: 'holz-space-grotesk' }
];

export const FONT_WEIGHTS: readonly FontWeight[] = [400, 500, 600];

export interface LoadedFont {
	id: FontId;
	weight: FontWeight;
	font: Font;
	/** Versalhöhe in Schrifteinheiten */
	capUnits: number;
	/** Kleinste Strichstärke der Versalien relativ zur Versalhöhe */
	upperStrokeRatio: number;
	/** Kleinste Strichstärke inklusive Kleinbuchstaben relativ zur Versalhöhe */
	lowerStrokeRatio: number;
}

export type FontLoadError =
	| { kind: 'network'; url: string; message: string }
	| { kind: 'http'; url: string; status: number }
	| { kind: 'parse'; url: string; message: string };

export function fontUrl(id: FontId, weight: FontWeight): string {
	return `/fonts/${id}/${id}-latin-${weight}-normal.woff`;
}

export function fontInfo(id: FontId): FontInfo {
	return FONT_CATALOG.find((f) => f.id === id) ?? FONT_CATALOG[0];
}

/** Längen der Abschnitte, die ein waagerechter oder senkrechter Strahl innerhalb der Glyphe schneidet. */
function rayRuns(glyph: Glyph, axis: 'x' | 'y', at: number): number[] {
	const polylines = flattenPath(glyph.path.commands, 24);
	const hits: number[] = [];
	const along: 'x' | 'y' = axis === 'x' ? 'y' : 'x';
	for (const poly of polylines) {
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const a: Point = poly[j];
			const b: Point = poly[i];
			if (a[axis] > at !== b[axis] > at) {
				const t = (at - a[axis]) / (b[axis] - a[axis]);
				hits.push(a[along] + t * (b[along] - a[along]));
			}
		}
	}
	hits.sort((p, q) => p - q);
	const runs: number[] = [];
	for (let i = 0; i + 1 < hits.length; i += 2) runs.push(hits[i + 1] - hits[i]);
	return runs;
}

function glyphCenterX(glyph: Glyph): number {
	const xs = flattenPath(glyph.path.commands).flat().map((p) => p.x);
	return (Math.min(...xs) + Math.max(...xs)) / 2;
}

function glyphXAt(glyph: Glyph, fraction: number): number {
	const xs = flattenPath(glyph.path.commands).flat().map((p) => p.x);
	const min = Math.min(...xs);
	return min + (Math.max(...xs) - min) * fraction;
}

/**
 * Misst die dünnsten typischen Striche: Stamm von I, Querstrich von H, Arme von E,
 * Scheitel von O; bei Kleinbuchstaben zusätzlich o, e und n.
 */
function measureStrokes(font: Font, capUnits: number): { upper: number; lower: number } {
	const xHeight = font.tables.os2?.sxHeight ?? capUnits * 0.7;
	const g = (c: string): Glyph => font.charToGlyph(c);
	const upperRuns = [
		...rayRuns(g('I'), 'y', capUnits / 2),
		...rayRuns(g('H'), 'x', glyphCenterX(g('H'))),
		...rayRuns(g('E'), 'x', glyphXAt(g('E'), 0.75)),
		...rayRuns(g('O'), 'x', glyphCenterX(g('O')))
	];
	const lowerRuns = [
		...rayRuns(g('n'), 'y', xHeight / 2),
		...rayRuns(g('o'), 'x', glyphCenterX(g('o'))),
		...rayRuns(g('e'), 'x', glyphCenterX(g('e')))
	];
	const upper = Math.min(...upperRuns.filter((r) => r > 0)) / capUnits;
	const lower = Math.min(upper, ...lowerRuns.filter((r) => r > 0).map((r) => r / capUnits));
	return { upper, lower };
}

export function describeFont(id: FontId, weight: FontWeight, font: Font): LoadedFont {
	const capUnits = font.tables.os2?.sCapHeight ?? font.unitsPerEm * 0.7;
	const strokes = measureStrokes(font, capUnits);
	return { id, weight, font, capUnits, upperStrokeRatio: strokes.upper, lowerStrokeRatio: strokes.lower };
}

export function parseFont(id: FontId, weight: FontWeight, buffer: ArrayBuffer): Result<LoadedFont, FontLoadError> {
	try {
		return ok(describeFont(id, weight, parse(buffer)));
	} catch (e) {
		return err({ kind: 'parse', url: fontUrl(id, weight), message: e instanceof Error ? e.message : String(e) });
	}
}

export interface FontLoader {
	load(id: FontId, weight: FontWeight): Promise<Result<LoadedFont, FontLoadError>>;
}

/** Lädt Schriften über `fetchFn` und hält erfolgreich geladene im Speicher. */
export function createFontLoader(fetchFn: typeof fetch): FontLoader {
	const cache = new Map<string, Promise<Result<LoadedFont, FontLoadError>>>();

	async function fetchAndParse(id: FontId, weight: FontWeight): Promise<Result<LoadedFont, FontLoadError>> {
		const url = fontUrl(id, weight);
		let response: Response;
		try {
			response = await fetchFn(url);
		} catch (e) {
			return err({ kind: 'network', url, message: e instanceof Error ? e.message : String(e) });
		}
		if (!response.ok) return err({ kind: 'http', url, status: response.status });
		return parseFont(id, weight, await response.arrayBuffer());
	}

	function load(id: FontId, weight: FontWeight): Promise<Result<LoadedFont, FontLoadError>> {
		const key = `${id}-${weight}`;
		const cached = cache.get(key);
		if (cached) return cached;
		const pending = fetchAndParse(id, weight).then((result) => {
			if (!result.ok) cache.delete(key);
			return result;
		});
		cache.set(key, pending);
		return pending;
	}

	return { load };
}
