import { describe, expect, it } from 'vitest';
import { TEST_ENGRAVING } from './testEngraving';
import { checkFabrication, textMargin } from './checks';
import { layoutLabel } from './layout';
import { loadTestFont } from '$lib/typesetting/testFonts';
import type { WoodEngraving } from './types';

const sora = loadTestFont('sora', 400);
const manrope = loadTestFont('manrope', 400);

function warningsFor(changes: Partial<WoodEngraving>, font = sora): string[] {
	const s = { ...TEST_ENGRAVING, ...changes };
	return checkFabrication(layoutLabel(s, font), s).map((w) => w.kind);
}

describe('Fertigungswarnungen', () => {
	it('Standardlabel ist ohne Warnung', () => {
		expect(warningsFor({})).toEqual([]);
	});

	it('warnt bei Versalhöhe unter 3 mm', () => {
		expect(warningsFor({ capHeight: 2.5 })).toContain('cap-height');
		expect(warningsFor({ capHeight: 3 })).not.toContain('cap-height');
	});

	it('warnt bei zu kleiner Unterzeile', () => {
		expect(warningsFor({ capHeight: 5, subText: 'Assiettes' })).toContain('cap-height');
	});

	it('warnt bei Strichstärke unter 0,3 mm', () => {
		// Manrope 400: dünnster Strich (Querstriche) knapp 10 % der Versalhöhe
		expect(manrope.upperStrokeRatio * 3).toBeLessThan(0.3);
		expect(warningsFor({ capHeight: 3, font: 'manrope' }, manrope)).toEqual(['stroke']);
		expect(warningsFor({ capHeight: 3.5, font: 'manrope' }, manrope)).not.toContain('stroke');
		// Kleinbuchstaben haben dünnere Striche als Versalien
		expect(warningsFor({ capHeight: 3.3, font: 'manrope', uppercase: false }, manrope)).toContain('stroke');
	});

	it('warnt bei weniger als 2 mm Randabstand und bei Überstand', () => {
		const tight = { sizeMode: 'manual' as const, width: 50, height: 12 };
		expect(warningsFor(tight)).toContain('margin');
		expect(warningsFor({ sizeMode: 'manual', width: 30, height: 12 })).toContain('overflow');
	});

	it('misst den Randabstand bei Rahmen bis zur Rahmenlinie', () => {
		const s: WoodEngraving = { ...TEST_ENGRAVING, sizeMode: 'manual', width: 70, height: 20 };
		const withFrame: WoodEngraving = { ...s, frame: true };
		expect(textMargin(layoutLabel(withFrame, sora), withFrame)).toBeLessThan(textMargin(layoutLabel(s, sora), s));
	});

	it('meldet die Größenbegrenzung', () => {
		expect(warningsFor({ text: 'Frühstücksgeschirr und Vorräte', capHeight: 14 })).toContain('size-limit');
	});
});
