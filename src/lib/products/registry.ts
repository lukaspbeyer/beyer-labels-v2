/**
 * Produktliste. Die Kura-Werkbank zeigt jedes eingetragene Produkt mit Beispielen;
 * ein neues Produkt trägt sich hier ein und erscheint dort ohne weitere Änderung.
 */
import type { Kura } from '$lib/kura/kura';
import { pageSvg } from '$lib/media/paper/page';
import { layoutLabel } from '$lib/media/wood/layout';
import type { LoadedFont } from '$lib/typesetting/fonts';
import type { Hint } from './hint';
import { checkPaperLabel, layoutPaperLabel, PAPER_LABEL_FORMATS, type PaperLabelInput } from './paperLabel';
import { checkWoodLabel, DEFAULT_WOOD_LABEL_INPUT, vocabularyMisfits, woodLabelSettings, woodLabelSketch, type WoodLabelInput } from './woodLabel';

export interface ProductExample {
	caption: string;
	/** Maßstäbliche Ansicht, 1 Einheit = 1 mm */
	svg: string;
	width: number;
	height: number;
	hints: Hint[];
}

export interface ProductEntry {
	id: string;
	name: string;
	medium: string;
	/** Eigene Seite des Produkts, falls vorhanden */
	href?: string;
	/** Beispiele im übergebenen Kura; so zeigt die Werkbank die Wirkung einer Änderung */
	examples(kura: Kura, font: LoadedFont): ProductExample[];
	/** Hinweise, die für das Produkt als Ganzes gelten */
	notes?(kura: Kura, font: LoadedFont): Hint[];
}

function woodExample(kura: Kura, font: LoadedFont, input: Partial<WoodLabelInput>, caption: string): ProductExample {
	const settings = woodLabelSettings(kura, { ...DEFAULT_WOOD_LABEL_INPUT, ...input });
	const layout = layoutLabel(settings, font);
	return { caption, svg: woodLabelSketch(layout, settings), width: layout.width, height: layout.height, hints: checkWoodLabel(kura, layout, settings) };
}

function paperExample(kura: Kura, font: LoadedFont, input: Omit<PaperLabelInput, 'position'>): ProductExample {
	const layout = layoutPaperLabel(kura, { ...input, position: 0 }, font);
	const page = { width: layout.width, height: layout.height, items: layout.lines.filter((l) => l.commands.length > 0).map((l) => ({ kind: 'fill' as const, commands: l.commands })) };
	const format = PAPER_LABEL_FORMATS[input.format];
	return { caption: `${format.name} ${format.width} × ${format.height} mm`, svg: pageSvg(page, kura.paper.ink), width: layout.width, height: layout.height, hints: checkPaperLabel(kura, layout) };
}

export const PRODUCTS: readonly ProductEntry[] = [
	{
		id: 'holzlabel',
		name: 'Holzlabel',
		medium: 'Lärche-Gravur',
		href: '/holz',
		examples: (kura, font) => [
			woodExample(kura, font, { text: 'teller' }, 'Serie 64 × 24 mm'),
			woodExample(kura, font, { text: 'duschgel' }, 'längstes Wort des Wortschatzes'),
			woodExample(kura, font, { text: 'servietten', format: 'long' }, 'Langformat 90 × 24 mm')
		],
		notes: (kura, font) => {
			const misfits = vocabularyMisfits(kura, font);
			return misfits.length > 0
				? [{ kind: 'vocabulary', message: `${misfits.length} Wörter des Wortschatzes passen nicht mehr ins Serienformat: ${misfits.join(', ')}.` }]
				: [];
		}
	},
	{
		id: 'papierlabel',
		name: 'Papierlabel',
		medium: 'Papier-Druck',
		href: '/papier',
		examples: (kura, font) => [
			paperExample(kura, font, { text: 'gewürze', subText: '', format: 'small' }),
			paperExample(kura, font, { text: 'winter', subText: 'mützen · schals', format: 'large' })
		]
	}
];
