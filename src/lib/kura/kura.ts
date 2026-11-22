/**
 * Kura, das Hausdesign. Die Werte stehen in kura.json; diese Datei prüft sie und
 * stellt die Regeln bereit, aus denen Produkte ihre Maße ableiten.
 * Produkte lesen Kura nur: Sie leiten ab und ergänzen, sie überschreiben nicht (docs/adr/0002).
 */
import { err, ok, type Result } from '$utils/result';
import { fontInfo, FONT_CATALOG } from '$utils/wood/fonts';
import type {
	EdgeFinish,
	FillColor,
	Finish,
	FontId,
	FontWeight,
	GrainDirection,
	Level,
	Process,
	Shape,
	TextAlign
} from '$utils/wood/types';
import values from './kura.json';

export type LetterCase = 'lower' | 'upper' | 'as-typed';

type DeepReadonly<T> = { readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K] };

interface KuraValues {
	/** Eine Schrift für alles */
	typeface: { font: FontId; weight: FontWeight };
	/** Textrolle „Zeichen“: das einzelne, gesperrte Wort */
	sign: { case: LetterCase; trackingPercent: number; align: TextAlign };
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
}

export type Kura = DeepReadonly<KuraValues>;

const LEVELS = ['low', 'medium', 'high'] as const;
const ENUMS = {
	'sign.case': ['lower', 'upper', 'as-typed'],
	'sign.align': ['left', 'center', 'right'],
	'wood.grain': ['horizontal', 'vertical'],
	'wood.process': ['dark', 'inverse', 'fill'],
	'wood.depth': LEVELS,
	'wood.burn': LEVELS,
	'wood.fillColor': ['black', 'white', 'anthracite'],
	'wood.finish': ['raw', 'oiled', 'lacquer', 'limed'],
	'wood.shape': ['rectangle', 'pill', 'oval'],
	'wood.edge': ['burnt', 'sanded']
} as const;
/** Zulässige Bereiche der Zahlenwerte: [kleinster, größter] */
const RANGES = {
	'sign.trackingPercent': [0, 40],
	'proportion.capHeightPerWidth': [0.02, 0.3],
	'proportion.capHeightPerHeight': [0.05, 0.6],
	'proportion.maxSignWidthRatio': [0.2, 0.9],
	'subLine.lineSpacing': [0.3, 1.5],
	'wood.cornerRadius': [0, 10]
} as const;

function at(raw: unknown, path: string): unknown {
	return path.split('.').reduce<unknown>((value, key) => (typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : undefined), raw);
}

/** Prüft eine Kura-Definition, etwa aus kura.json; liefert alle Verstöße auf einmal. */
export function parseKura(raw: unknown): Result<Kura, string[]> {
	const problems: string[] = [];
	for (const [path, allowed] of Object.entries(ENUMS)) {
		if (!(allowed as readonly unknown[]).includes(at(raw, path))) problems.push(`${path}: erlaubt sind ${allowed.join(', ')}`);
	}
	for (const [path, [min, max]] of Object.entries(RANGES)) {
		const value = at(raw, path);
		if (typeof value !== 'number' || !(value >= min && value <= max)) problems.push(`${path}: Zahl zwischen ${min} und ${max} erwartet`);
	}
	if (typeof at(raw, 'wood.frame') !== 'boolean') problems.push('wood.frame: true oder false erwartet');
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

/** Schreibweise einer Textrolle anwenden. */
export function applyCase(letterCase: LetterCase, text: string): string {
	if (letterCase === 'lower') return text.toLocaleLowerCase('de-DE');
	if (letterCase === 'upper') return text.toLocaleUpperCase('de-DE');
	return text;
}
