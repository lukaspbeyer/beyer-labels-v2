import { describe, expect, it } from 'vitest';
import { DEFAULT_WOOD_SETTINGS } from '$stores/wood';
import { calibration } from './calibration';
import { FONT_CATALOG } from './fonts';
import { flattenPath, pathBox, polylinesBox, shapePath, signedDistance } from './geometry';
import { layoutLabel, setLine } from './layout';
import { loadTestFont } from './testFonts';
import type { WoodSettings } from './types';

const sora = loadTestFont('sora', 400);

function settings(changes: Partial<WoodSettings> = {}): WoodSettings {
	return { ...DEFAULT_WOOD_SETTINGS, ...changes };
}

describe('Schriften', () => {
	it.each(FONT_CATALOG.flatMap((f) => f.weights.map((w) => [f.id, w] as const)))(
		'%s %i lässt sich laden und hat plausible Strichstärken',
		(id, weight) => {
			const font = loadTestFont(id, weight);
			// Versalhöhe gemessen an H: liegt nahe am Metrikwert der Schrift
			expect(font.capUnits / (font.font.tables.os2?.sCapHeight ?? font.capUnits)).toBeCloseTo(1, 1);
			// Serifenschriften (Mincho) haben deutlich dünnere Haarstriche
			expect(font.upperStrokeRatio).toBeGreaterThan(0.03);
			expect(font.upperStrokeRatio).toBeLessThan(0.25);
			expect(font.lowerStrokeRatio).toBeLessThanOrEqual(font.upperStrokeRatio);
		}
	);

	it('kräftigere Schnitte haben dickere Striche', () => {
		expect(loadTestFont('sora', 600).upperStrokeRatio).toBeGreaterThan(sora.upperStrokeRatio);
	});
});

describe('Zeilensatz', () => {
	it('setzt die Versalhöhe in mm exakt', () => {
		const line = setLine(sora, 'H', 8, 0);
		const box = pathBox(line.commands);
		expect(box.maxY - box.minY).toBeCloseTo(8, 2);
		expect(box.maxY).toBeCloseTo(0, 2);
	});

	it('Laufweite verbreitert die Zeile', () => {
		const tight = setLine(sora, 'TELLER', 8, 0);
		const wide = setLine(sora, 'TELLER', 8, 20);
		const fontSize = (8 * sora.font.unitsPerEm) / sora.capUnits;
		const extra = wide.ink.maxX - wide.ink.minX - (tight.ink.maxX - tight.ink.minX);
		expect(extra).toBeCloseTo(5 * 0.2 * fontSize, 3);
	});

	it('Versalien wandeln deutsche Wörter um', () => {
		const layout = layoutLabel(settings({ text: 'Gewürze', uppercase: true }), sora);
		const lower = layoutLabel(settings({ text: 'Gewürze', uppercase: false }), sora);
		expect(pathBox(layout.lines[0].commands).maxX).not.toBeCloseTo(pathBox(lower.lines[0].commands).maxX, 1);
	});
});

describe('Labelgröße und Platzierung', () => {
	it('automatische Größe ist ganzzahlig, innerhalb der Grenzen und enthält den Text mit Abstand', () => {
		for (const shape of ['rectangle', 'pill', 'oval'] as const) {
			const s = settings({ shape, subText: 'Assiettes' });
			const layout = layoutLabel(s, sora);
			expect(Number.isInteger(layout.width)).toBe(true);
			expect(Number.isInteger(layout.height)).toBe(true);
			expect(layout.width).toBeGreaterThanOrEqual(calibration.layout.minWidth);
			expect(layout.height).toBeLessThanOrEqual(calibration.layout.maxHeight);
			const outline = flattenPath(layout.outline);
			const points = layout.lines.flatMap((l) => flattenPath(l.commands).flat());
			const margin = Math.min(...points.map((p) => signedDistance(p, outline)));
			expect(margin).toBeGreaterThanOrEqual(calibration.layout.minPadding - 0.01);
		}
	});

	it('zentriert die Hauptzeile horizontal und an der Versalhöhe vertikal', () => {
		const layout = layoutLabel(settings({ text: 'TELLER' }), sora);
		const box = pathBox(layout.lines[0].commands);
		expect((box.minX + box.maxX) / 2).toBeCloseTo(layout.width / 2, 2);
		expect((box.minY + box.maxY) / 2).toBeCloseTo(layout.height / 2, 1);
	});

	it('manuelle Größe wird übernommen, Ausrichtung links und rechts halten den Innenabstand', () => {
		const left = layoutLabel(settings({ sizeMode: 'manual', width: 120, height: 40, align: 'left' }), sora);
		const right = layoutLabel(settings({ sizeMode: 'manual', width: 120, height: 40, align: 'right' }), sora);
		expect(left.width).toBe(120);
		expect(left.height).toBe(40);
		const pad = Math.max(calibration.layout.minPadding, calibration.layout.paddingX * 8);
		expect(pathBox(left.lines[0].commands).minX).toBeCloseTo(pad, 2);
		expect(pathBox(right.lines[0].commands).maxX).toBeCloseTo(120 - pad, 2);
	});

	it('begrenzt sehr lange Texte auf die Höchstmaße und meldet das', () => {
		const layout = layoutLabel(settings({ text: 'Frühstücksgeschirr und Vorräte', capHeight: 14 }), sora);
		expect(layout.width).toBe(calibration.layout.maxWidth);
		expect(layout.clamped).toBe(true);
	});

	it('Rahmen und inverses Gravurfeld liegen innerhalb der Kontur', () => {
		const layout = layoutLabel(settings({ frame: true, process: 'inverse' }), sora);
		const outline = polylinesBox(flattenPath(layout.outline));
		const frame = polylinesBox(flattenPath(layout.frame));
		const field = polylinesBox(flattenPath(layout.inverseField));
		expect(frame.minX).toBeCloseTo(calibration.frame.insetMm + calibration.frame.lineWidthMm / 2, 3);
		expect(field.minX).toBeCloseTo(calibration.engraving.inverseRimMm, 3);
		expect(outline.maxX).toBeCloseTo(layout.width, 3);
	});
});

describe('Formen', () => {
	it.each(['rectangle', 'pill', 'oval'] as const)('%s füllt genau Breite × Höhe', (shape) => {
		const box = pathBox(shapePath(shape, 80, 30, 3));
		expect(box.minX).toBeCloseTo(0, 3);
		expect(box.minY).toBeCloseTo(0, 3);
		expect(box.maxX).toBeCloseTo(80, 3);
		expect(box.maxY).toBeCloseTo(30, 3);
	});
});
