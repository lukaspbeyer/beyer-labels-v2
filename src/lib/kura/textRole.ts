/**
 * Satz in einer Textrolle: Text so setzen, wie Kura die Rolle festlegt (Schreibweise, Laufweite, Ausrichtung),
 * seine Breite messen und sagen, was daran gegen Kura verstößt: Zeichen, die die Schrift nicht hat (`character`),
 * und die Breite des Zeichens auf seiner Fläche (`sign-width`, bei der Unterzeile `sub-width`).
 * Produkte setzen Text nur über dieses Modul; so gelten die Regeln für jedes Produkt gleich.
 * Kura kennt nur sich und den Schriftsatz (docs/adr/0001): Den Ort im Inhalt (`at`) reicht der Aufrufer herein.
 */
import type { LoadedFont } from '$lib/typesetting/fonts';
import { formatMm } from '$lib/typesetting/format';
import { translatePath } from '$lib/typesetting/geometry';
import { setLine } from '$lib/typesetting/line';
import type { PathCommand, Rect, TextAlign } from '$lib/typesetting/types';
import { maxSignWidth, signCapHeight, type Kura, type LetterCase } from './kura';

/** „Zeichen“ (`sign`): das einzelne, gesperrte Wort. „Text“ (`text`): der Listeneintrag. */
export type TextRole = 'sign' | 'text';

/** Wo im Inhalt der Text steht, von außen nach innen, etwa ['labels', 1, 'text']. Kura reicht ihn nur weiter. */
export type At = readonly (string | number)[];

/** Verstoß gegen eine Regel von Kura, in der Form eines Hinweises der Produkte (products/hint.ts). */
export interface RoleHint {
	kind: 'character' | 'sign-width' | 'sub-width';
	at: At;
	/** Sagt, was zu ändern ist, ohne den Ort */
	message: string;
}

/** Eine gesetzte Zeile. */
export interface RoleLine {
	/** Der Text, wie Kura ihn schreibt */
	text: string;
	/** Konturen in mm, y nach unten. Aus `setRoleLine`: linke Kante der Kontur bei x = 0, Grundlinie bei y = 0. */
	commands: PathCommand[];
	capHeight: number;
	/** Breite der Kontur, 0 bei leerer Zeile */
	width: number;
	/** Zeichen, die die Schrift nicht hat */
	hints: RoleHint[];
}

function applyCase(letterCase: LetterCase, text: string): string {
	if (letterCase === 'lower') return text.toLocaleLowerCase('de-DE');
	if (letterCase === 'upper') return text.toLocaleUpperCase('de-DE');
	return text;
}

/** Der Text, wie Kura ihn in der Rolle schreibt (Schreibweise). */
export function roleText(kura: Kura, role: TextRole, text: string): string {
	return applyCase(kura[role].case, text);
}

/** Zeichen des geschriebenen Textes, die die Schrift nicht hat; jedes einmal, Leerraum zählt nicht. */
function missingCharacters(font: LoadedFont, text: string): string[] {
	return [...new Set(Array.from(text).filter((ch) => !/\s/u.test(ch) && font.font.charToGlyph(ch).index === 0))];
}

/**
 * Setzt eine Zeile in der Rolle: Schreibweise und Laufweite aus Kura, Versalhöhe vom Aufrufer.
 * Meldet Zeichen, die die Schrift nicht hat (`character`, am Ort `at`); sie würden als leere Kästchen gedruckt.
 */
export function setRoleLine(kura: Kura, font: LoadedFont, role: TextRole, text: string, capHeight: number, at: At = []): RoleLine {
	const shown = roleText(kura, role, text);
	const missing = missingCharacters(font, shown);
	const hints: RoleHint[] =
		missing.length > 0 ? [{ kind: 'character', at, message: `„${text}“ enthält Zeichen, die die Schrift nicht hat: ${missing.join(' ')}. Ersetzen oder weglassen.` }] : [];
	const set = setLine(font, shown, capHeight, kura[role].trackingPercent);
	if (!Number.isFinite(set.ink.maxX)) return { text: shown, commands: [], capHeight, width: 0, hints };
	return { text: shown, commands: translatePath(set.commands, -set.ink.minX, 0), capHeight, width: set.ink.maxX - set.ink.minX, hints };
}

/**
 * Stellt eine Zeile aus `setRoleLine` in den Bereich von `span.x` bis `span.x + span.width`, nach `align`.
 * Bei Breite 0 ist `span.x` die Kante, an der die Zeile links oder rechts steht.
 */
export function placeLine(line: RoleLine, align: TextAlign, span: { x: number; width: number }, baseline: number): RoleLine {
	const left = align === 'left' ? span.x : align === 'right' ? span.x + span.width - line.width : span.x + (span.width - line.width) / 2;
	return { ...line, commands: translatePath(line.commands, left, baseline) };
}

export interface SignOptions {
	/** Versalhöhe, wenn sie nicht aus dieser Fläche folgt, etwa damit mehrere Formate dieselbe Schrift tragen */
	capHeight?: number;
	/** Das Zeichen steht neben Text: Es folgt der Ausrichtung der Rolle „Text“ (Kura) */
	besideText?: boolean;
	/** Senkrecht mittig in der Fläche (Vorgabe) oder an ihrer Oberkante */
	vertical?: 'center' | 'top';
}

export interface SetSign {
	/** Das Zeichen, danach die Unterzeile, falls sie Text hat; in Koordinaten der Fläche */
	lines: RoleLine[];
	/** Je Zeile: Zeichen ohne Glyphe, dann die Breite gegen Kura */
	hints: RoleHint[];
}

/**
 * Setzt das Zeichen, wahlweise mit Unterzeile, auf eine Fläche. Aus Kura: Versalhöhe aus der Fläche,
 * Unterzeile kleiner im Abstand der Unterzeilen-Regel, Ausrichtung der Rolle. Senkrecht gemessen
 * von der Oberkante der Versalien des Zeichens bis zur Grundlinie der letzten Zeile.
 * Meldet Zeichen ohne Glyphe und jede Zeile, die breiter ist, als Kura auf dieser Fläche zulässt.
 */
export function setSign(kura: Kura, font: LoadedFont, surface: Rect, sign: { text: string; at: At }, sub?: { text: string; at: At }, options: SignOptions = {}): SetSign {
	const capHeight = options.capHeight ?? signCapHeight(kura, surface.width, surface.height);
	const gap = kura.subLine.lineSpacing * capHeight;
	const parts = [{ ...sign, capHeight }, ...(sub && sub.text.trim() ? [{ ...sub, capHeight: capHeight * kura.subLine.capRatio }] : [])];
	const set = parts.map((p) => setRoleLine(kura, font, 'sign', p.text.trim(), p.capHeight, p.at));
	const baselines = set.reduce<number[]>((acc, line, i) => [...acc, i === 0 ? line.capHeight : acc[i - 1] + gap + line.capHeight], []);
	const blockHeight = baselines[baselines.length - 1] ?? 0;
	const top = options.vertical === 'top' ? surface.y : surface.y + (surface.height - blockHeight) / 2;
	const align = options.besideText ? kura.text.align : kura.sign.align;
	const lines = set.map((line, i) => placeLine(line, align, surface, top + baselines[i]));
	const limit = maxSignWidth(kura, surface.width);
	const hints = lines.flatMap((line, i): RoleHint[] => [
		...line.hints,
		...(line.width > limit + 1e-6
			? [
					{
						kind: i === 0 ? ('sign-width' as const) : ('sub-width' as const),
						at: parts[i].at,
						message: `${i === 0 ? 'Das Wort' : 'Die Unterzeile'} ist ${formatMm(line.width)} mm breit, Kura lässt auf diesem Format höchstens ${formatMm(limit)} mm zu. Kürzer fassen oder ein größeres Format wählen.`
					}
				]
			: [])
	]);
	return { lines, hints };
}
