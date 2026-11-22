import { describe, expect, it } from 'vitest';
import { TEST_SETTINGS } from './testSettings';
import { flattenPath, isInside, polylinesBox } from '$lib/typesetting/geometry';
import { layoutLabel } from './layout';
import { buildSvg, exportFileName } from './svgExport';
import { loadTestFont } from '$lib/typesetting/testFonts';
import type { PathCommand, Point, WoodSettings } from './types';

const sora = loadTestFont('sora', 400);

function exportFor(changes: Partial<WoodSettings> = {}): { svg: Document; text: string; settings: WoodSettings } {
	const s = { ...TEST_SETTINGS, ...changes };
	const text = buildSvg(layoutLabel(s, sora), s);
	return { svg: new DOMParser().parseFromString(text, 'image/svg+xml'), text, settings: s };
}

/** Liest einen exportierten Pfad (nur absolute M, L, C, Q, Z) zurück. */
function parsePathData(d: string): PathCommand[] {
	const tokens = d.match(/[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
	const commands: PathCommand[] = [];
	let i = 0;
	const num = (): number => Number(tokens[i++]);
	while (i < tokens.length) {
		const t = tokens[i++];
		if (t === 'Z') commands.push({ type: 'Z' });
		else if (t === 'M' || t === 'L') commands.push({ type: t, x: num(), y: num() });
		else if (t === 'Q') commands.push({ type: 'Q', x1: num(), y1: num(), x: num(), y: num() });
		else if (t === 'C') commands.push({ type: 'C', x1: num(), y1: num(), x2: num(), y2: num(), x: num(), y: num() });
	}
	return commands;
}

function groupPath(svg: Document, id: string): string {
	return svg.querySelector(`g#${id} path`)?.getAttribute('d') ?? '';
}

describe('SVG-Export', () => {
	it('hat Maße in mm und einen passenden viewBox (1 Einheit = 1 mm)', () => {
		const { svg } = exportFor();
		const root = svg.documentElement;
		const layout = layoutLabel(TEST_SETTINGS, sora);
		expect(root.getAttribute('width')).toBe(`${layout.width}mm`);
		expect(root.getAttribute('height')).toBe(`${layout.height}mm`);
		expect(root.getAttribute('viewBox')).toBe(`0 0 ${layout.width} ${layout.height}`);
	});

	it('Schnittkontur ist auf 0,1 mm maßgenau', () => {
		for (const shape of ['rectangle', 'pill', 'oval'] as const) {
			const { svg } = exportFor({ shape, sizeMode: 'manual', width: 92, height: 31 });
			const box = polylinesBox(flattenPath(parsePathData(groupPath(svg, 'schnitt'))));
			expect(Math.abs(box.minX)).toBeLessThan(0.1);
			expect(Math.abs(box.minY)).toBeLessThan(0.1);
			expect(Math.abs(box.maxX - 92)).toBeLessThan(0.1);
			expect(Math.abs(box.maxY - 31)).toBeLessThan(0.1);
		}
	});

	it('enthält Text nur als Pfad, ohne Schriftverweise', () => {
		const { text, svg } = exportFor({ subText: 'Assiettes' });
		expect(text).not.toMatch(/<text|font-family|@font-face|<tspan/);
		expect(groupPath(svg, 'gravur').length).toBeGreaterThan(100);
	});

	it('trennt die Ebenen nach Farbe', () => {
		const { svg } = exportFor({ frame: true });
		expect(svg.querySelector('g#schnitt')?.getAttribute('stroke')).toBe('#FF0000');
		expect(svg.querySelector('g#schnitt')?.getAttribute('fill')).toBe('none');
		expect(svg.querySelector('g#gravur')?.getAttribute('fill')).toBe('#000000');
		expect(svg.querySelector('g#gravur')?.getAttribute('stroke')).toBe('none');
		expect(svg.querySelector('g#rahmen')?.getAttribute('stroke')).toBe('#0000FF');
		expect(svg.querySelector('g#rahmen')?.getAttribute('fill')).toBe('none');
	});

	it('ohne Rahmen gibt es keine blaue Ebene', () => {
		expect(exportFor({ frame: false }).svg.querySelector('g#rahmen')).toBeNull();
	});

	it('inverse Gravur: Fläche = Gravurfeld ohne Schrift', () => {
		const { svg } = exportFor({ process: 'inverse' });
		const path = svg.querySelector('g#gravur path');
		expect(path?.getAttribute('fill-rule')).toBe('evenodd');
		const polylines = flattenPath(parsePathData(path?.getAttribute('d') ?? ''));
		const layout = layoutLabel({ ...TEST_SETTINGS, process: 'inverse' }, sora);
		const inField: Point = { x: 4.5, y: layout.height / 2 };
		const inRim: Point = { x: 1, y: layout.height / 2 };
		const glyph = flattenPath(layout.lines[0].commands);
		const box = polylinesBox(glyph);
		const candidates: Point[] = Array.from({ length: 400 }, (_, i) => ({
			x: box.minX + ((i % 20) + 0.5) * ((box.maxX - box.minX) / 20),
			y: box.minY + (Math.floor(i / 20) + 0.5) * ((box.maxY - box.minY) / 20)
		}));
		const insideStem = candidates.find((p) => isInside(p, glyph)) ?? { x: -1, y: -1 };
		const counter = candidates.find((p) => !isInside(p, glyph)) ?? { x: -1, y: -1 };
		expect(isInside(counter, polylines)).toBe(true);
		expect(isInside(inField, polylines)).toBe(true);
		expect(isInside(inRim, polylines)).toBe(false);
		expect(isInside(insideStem, glyph)).toBe(true);
		expect(isInside(insideStem, polylines)).toBe(false);
	});

	it('Dateiname folgt dem Muster holzlabel-<text>-<b>x<h>mm.svg', () => {
		const s = { ...TEST_SETTINGS, sizeMode: 'manual' as const, width: 80, height: 30 };
		expect(exportFileName(s, layoutLabel(s, sora))).toBe('holzlabel-teller-80x30mm.svg');
		const umlaut = { ...s, text: 'Gewürze & Öle' };
		expect(exportFileName(umlaut, layoutLabel(umlaut, sora))).toBe('holzlabel-gewuerze-oele-80x30mm.svg');
	});
});
