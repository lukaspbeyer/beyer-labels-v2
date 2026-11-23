/**
 * Kura, das Hausdesign. Die Werte stehen in kura.json; diese Datei prüft sie und
 * stellt die Regeln bereit, aus denen Produkte ihre Maße ableiten.
 * Produkte lesen Kura nur: Sie leiten ab und ergänzen, sie überschreiben nicht (docs/adr/0002).
 */
import { err, ok, type Result } from '$utils/result';
import { fontInfo, FONT_CATALOG } from '$lib/typesetting/fonts';
import type { FontId, FontWeight, Shape, TextAlign } from '$lib/typesetting/types';
import values from './kura.json';

export type LetterCase = 'lower' | 'upper' | 'as-typed';

/** Wahlwerte der Ausprägung für Lärche. Kura legt sie fest, das Medium liest sie (docs/adr/0001). */
export type GrainDirection = 'horizontal' | 'vertical';
export type Process = 'dark' | 'inverse' | 'fill';
export type Level = 'low' | 'medium' | 'high';
export type FillColor = 'black' | 'white' | 'anthracite';
export type Finish = 'raw' | 'oiled' | 'lacquer' | 'limed';
/** Kante: so wie der Laser sie schneidet oder hell nachgeschliffen */
export type EdgeFinish = 'burnt' | 'sanded';

type DeepReadonly<T> = { readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K] };

export interface KuraValues {
	/** Eine Schrift für alles */
	typeface: { font: FontId; weight: FontWeight };
	/** Textrolle „Zeichen“: das einzelne, gesperrte Wort */
	sign: { case: LetterCase; trackingPercent: number; align: TextAlign };
	/** Textrolle „Text“: Listeneinträge und Angaben; ihre Ausrichtung gilt auch für Überschriften von Zonen und für ein Zeichen, das neben Text steht */
	text: { case: LetterCase; trackingPercent: number; align: TextAlign };
	/** Verhältnis von Schrift zu Fläche */
	proportion: {
		/** Versalhöhe des Zeichens je mm Breite der Fläche */
		capHeightPerWidth: number;
		/** Obergrenze der Versalhöhe je mm Höhe der Fläche */
		capHeightPerHeight: number;
		/** Größte Breite des Zeichens relativ zur Breite der Fläche */
		maxSignWidthRatio: number;
	};
	subLine: {
		/** Versalhöhe der Unterzeile relativ zur Hauptzeile */
		capRatio: number;
		/** Abstand zur Unterzeile in Vielfachen der Versalhöhe */
		lineSpacing: number;
	};
	/** Ausprägung für das Medium Lärche-Gravur */
	wood: {
		grain: GrainDirection;
		process: Process;
		depth: Level;
		burn: Level;
		fillColor: FillColor;
		finish: Finish;
		shape: Shape;
		cornerRadius: number;
		frame: boolean;
		edge: EdgeFinish;
	};
	/** Ausprägung für das Medium Papier-Druck */
	paper: {
		/** Druckfarbe als #rrggbb */
		ink: string;
		/** Versalhöhe von Lesetext in mm */
		textCapHeight: number;
		/** Stärke feiner Linien in mm */
		ruleWidth: number;
	};
}

export type Kura = DeepReadonly<KuraValues>;

const LEVELS = ['low', 'medium', 'high'] as const;
/** Zulässige Werte der Auswahlfelder */
export const KURA_OPTIONS = {
	'sign.case': ['lower', 'upper', 'as-typed'],
	'sign.align': ['left', 'center', 'right'],
	'text.case': ['lower', 'upper', 'as-typed'],
	'text.align': ['left', 'center', 'right'],
	'wood.grain': ['horizontal', 'vertical'],
	'wood.process': ['dark', 'inverse', 'fill'],
	'wood.depth': LEVELS,
	'wood.burn': LEVELS,
	'wood.fillColor': ['black', 'white', 'anthracite'],
	'wood.finish': ['raw', 'oiled', 'lacquer', 'limed'],
	'wood.shape': ['rectangle', 'pill', 'oval'],
	'wood.edge': ['burnt', 'sanded']
} as const;

export type KuraOption = keyof typeof KURA_OPTIONS;
export type KuraOptionValue<P extends KuraOption> = (typeof KURA_OPTIONS)[P][number];

/** Name eines Auswahlfelds und je zulässigem Wert ein Name; der Typ verlangt für jeden Wert aus KURA_OPTIONS genau einen. */
type KuraOptionNames = {
	readonly [P in KuraOption]: { readonly title: string; readonly values: { readonly [V in KuraOptionValue<P>]: string } };
};

/**
 * Die Namen der Auswahlfelder und ihrer Werte, wie Werkbank und Laserdatei sie zeigen.
 * Die Schreibweisen nennen sich in ihrer eigenen Schreibweise.
 */
export const KURA_OPTION_NAMES: KuraOptionNames = {
	'sign.case': { title: 'Schreibweise', values: { lower: 'klein', upper: 'VERSAL', 'as-typed': 'Wie eingegeben' } },
	'sign.align': { title: 'Ausrichtung', values: { left: 'Links', center: 'Mittig', right: 'Rechts' } },
	'text.case': { title: 'Schreibweise', values: { lower: 'klein', upper: 'VERSAL', 'as-typed': 'Wie eingegeben' } },
	'text.align': { title: 'Ausrichtung', values: { left: 'Links', center: 'Mittig', right: 'Rechts' } },
	'wood.grain': { title: 'Maserung', values: { horizontal: 'Waagerecht', vertical: 'Senkrecht' } },
	'wood.process': { title: 'Verfahren', values: { dark: 'Dunkle Gravur', inverse: 'Inverse Gravur', fill: 'Farbfüllung' } },
	'wood.depth': { title: 'Tiefe', values: { low: 'Flach', medium: 'Mittel', high: 'Tief' } },
	'wood.burn': { title: 'Brennfarbe', values: { low: 'Hell', medium: 'Mittel', high: 'Dunkel' } },
	'wood.fillColor': { title: 'Füllfarbe', values: { black: 'Schwarz', white: 'Weiß', anthracite: 'Anthrazit' } },
	'wood.finish': { title: 'Oberfläche', values: { raw: 'Roh', oiled: 'Geölt', lacquer: 'Lack matt', limed: 'Weiß gekalkt' } },
	'wood.shape': { title: 'Form', values: { rectangle: 'Rechteck', pill: 'Pille', oval: 'Oval' } },
	'wood.edge': { title: 'Kante', values: { burnt: 'Gebrannt', sanded: 'Geschliffen' } }
};

/** Die Werte eines Auswahlfelds in der Reihenfolge von KURA_OPTIONS, je mit Namen (für Auswahlknöpfe). */
export function kuraChoices<P extends KuraOption>(path: P): { value: KuraOptionValue<P>; label: string }[] {
	const names: Readonly<Record<KuraOptionValue<P>, string>> = KURA_OPTION_NAMES[path].values;
	return (KURA_OPTIONS[path] as readonly KuraOptionValue<P>[]).map((value) => ({ value, label: names[value] }));
}

/** Name des Werts eines Auswahlfelds. */
export function kuraOptionName<P extends KuraOption>(path: P, value: KuraOptionValue<P>): string {
	const names: Readonly<Record<KuraOptionValue<P>, string>> = KURA_OPTION_NAMES[path].values;
	return names[value];
}

/** Wie Kura ein eingegebenes Wort schreibt, für Sätze wie „Kura schreibt es klein“. */
export function caseInWords(letterCase: LetterCase): string {
	return { lower: 'klein', upper: 'groß', 'as-typed': 'wie eingegeben' }[letterCase];
}

/** Zulässige Bereiche der Zahlenwerte: [kleinster, größter] */
export const KURA_RANGES = {
	'sign.trackingPercent': [0, 40],
	'text.trackingPercent': [0, 20],
	'proportion.capHeightPerWidth': [0.02, 0.3],
	'proportion.capHeightPerHeight': [0.05, 0.6],
	'proportion.maxSignWidthRatio': [0.2, 0.9],
	'subLine.capRatio': [0.3, 1],
	'subLine.lineSpacing': [0.3, 1.5],
	'wood.cornerRadius': [0, 10],
	'paper.textCapHeight': [2.5, 6],
	'paper.ruleWidth': [0.1, 1]
} as const;

function at(raw: unknown, path: string): unknown {
	return path.split('.').reduce<unknown>((value, key) => (typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : undefined), raw);
}

/** Prüft eine Kura-Definition, etwa aus kura.json; liefert alle Verstöße auf einmal. */
export function parseKura(raw: unknown): Result<Kura, string[]> {
	const problems: string[] = [];
	for (const [path, allowed] of Object.entries(KURA_OPTIONS)) {
		if (!(allowed as readonly unknown[]).includes(at(raw, path))) problems.push(`${path}: erlaubt sind ${allowed.join(', ')}`);
	}
	for (const [path, [min, max]] of Object.entries(KURA_RANGES)) {
		const value = at(raw, path);
		if (typeof value !== 'number' || !(value >= min && value <= max)) problems.push(`${path}: Zahl zwischen ${min} und ${max} erwartet`);
	}
	if (typeof at(raw, 'wood.frame') !== 'boolean') problems.push('wood.frame: true oder false erwartet');
	const ink = at(raw, 'paper.ink');
	if (typeof ink !== 'string' || !/^#[0-9a-f]{6}$/i.test(ink)) problems.push('paper.ink: Farbe als #rrggbb erwartet');
	const font = at(raw, 'typeface.font');
	const known = FONT_CATALOG.find((f) => f.id === font);
	if (!known) problems.push(`typeface.font: erlaubt sind ${FONT_CATALOG.map((f) => f.id).join(', ')}`);
	else if (!(known.weights as readonly unknown[]).includes(at(raw, 'typeface.weight')))
		problems.push(`typeface.weight: ${fontInfo(known.id).name} hat die Schnitte ${known.weights.join(', ')}`);
	return problems.length > 0 ? err(problems) : ok(raw as Kura);
}

function load(): Kura {
	const result = parseKura(values);
	if (!result.ok) throw new Error(`kura.json ist ungültig:\n${result.error.join('\n')}`);
	return result.value;
}

/** Das geltende Hausdesign. */
export const KURA: Kura = load();

/** Versalhöhe des Zeichens auf einer Fläche: proportional zur Breite, begrenzt durch die Höhe. */
export function signCapHeight(kura: Kura, width: number, height: number): number {
	return Math.min(width * kura.proportion.capHeightPerWidth, height * kura.proportion.capHeightPerHeight);
}

/** Größte Breite des Zeichens auf einer Fläche; der Rest bleibt frei. */
export function maxSignWidth(kura: Kura, width: number): number {
	return width * kura.proportion.maxSignWidthRatio;
}

/** Geänderte Werte zwischen zwei Kura-Definitionen als „pfad: alt → neu“, in der Reihenfolge der Definition. */
export function kuraChanges(before: unknown, after: unknown, path = ''): string[] {
	if (typeof before === 'object' && before !== null && typeof after === 'object' && after !== null) {
		return Object.keys(after).flatMap((key) => kuraChanges((before as Record<string, unknown>)[key], (after as Record<string, unknown>)[key], path ? `${path}.${key}` : key));
	}
	return before === after ? [] : [`${path}: ${String(before)} → ${String(after)}`];
}
