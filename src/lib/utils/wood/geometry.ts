/** Geometrie der Labelformen und Pfadwerkzeuge. Koordinaten in mm, y nach unten. */
import type { Box, PathCommand, Point, Shape } from './types';

const KAPPA = 0.5522847498;
const CURVE_STEPS = 12;

export function roundedRectPath(x: number, y: number, w: number, h: number, radius: number): PathCommand[] {
	const r = Math.max(0, Math.min(radius, w / 2, h / 2));
	if (r === 0) {
		return [
			{ type: 'M', x, y },
			{ type: 'L', x: x + w, y },
			{ type: 'L', x: x + w, y: y + h },
			{ type: 'L', x, y: y + h },
			{ type: 'Z' }
		];
	}
	const k = r * KAPPA;
	const right = x + w;
	const bottom = y + h;
	return [
		{ type: 'M', x: x + r, y },
		{ type: 'L', x: right - r, y },
		{ type: 'C', x1: right - r + k, y1: y, x2: right, y2: y + r - k, x: right, y: y + r },
		{ type: 'L', x: right, y: bottom - r },
		{ type: 'C', x1: right, y1: bottom - r + k, x2: right - r + k, y2: bottom, x: right - r, y: bottom },
		{ type: 'L', x: x + r, y: bottom },
		{ type: 'C', x1: x + r - k, y1: bottom, x2: x, y2: bottom - r + k, x, y: bottom - r },
		{ type: 'L', x, y: y + r },
		{ type: 'C', x1: x, y1: y + r - k, x2: x + r - k, y2: y, x: x + r, y },
		{ type: 'Z' }
	];
}

export function ellipsePath(cx: number, cy: number, rx: number, ry: number): PathCommand[] {
	const kx = rx * KAPPA;
	const ky = ry * KAPPA;
	return [
		{ type: 'M', x: cx + rx, y: cy },
		{ type: 'C', x1: cx + rx, y1: cy + ky, x2: cx + kx, y2: cy + ry, x: cx, y: cy + ry },
		{ type: 'C', x1: cx - kx, y1: cy + ry, x2: cx - rx, y2: cy + ky, x: cx - rx, y: cy },
		{ type: 'C', x1: cx - rx, y1: cy - ky, x2: cx - kx, y2: cy - ry, x: cx, y: cy - ry },
		{ type: 'C', x1: cx + kx, y1: cy - ry, x2: cx + rx, y2: cy - ky, x: cx + rx, y: cy },
		{ type: 'Z' }
	];
}

/**
 * Kontur der Labelform, um `inset` nach innen versetzt.
 * Beim Oval wird die Versatzkurve durch ein kleineres Oval angenähert.
 */
export function shapePath(shape: Shape, width: number, height: number, cornerRadius: number, inset = 0): PathCommand[] {
	const w = width - 2 * inset;
	const h = height - 2 * inset;
	if (w <= 0 || h <= 0) return [];
	if (shape === 'oval') return ellipsePath(width / 2, height / 2, w / 2, h / 2);
	const radius = shape === 'pill' ? Math.min(w, h) / 2 : Math.max(0, cornerRadius - inset);
	return roundedRectPath(inset, inset, w, h, radius);
}

/** Zerlegt einen Pfad in geschlossene Polygonzüge. */
export function flattenPath(commands: readonly PathCommand[], steps = CURVE_STEPS): Point[][] {
	const polylines: Point[][] = [];
	let current: Point[] = [];
	let pen: Point = { x: 0, y: 0 };
	for (const c of commands) {
		if (c.type === 'M') {
			if (current.length > 1) polylines.push(current);
			current = [{ x: c.x, y: c.y }];
			pen = { x: c.x, y: c.y };
		} else if (c.type === 'L') {
			current.push({ x: c.x, y: c.y });
			pen = { x: c.x, y: c.y };
		} else if (c.type === 'Q') {
			for (let i = 1; i <= steps; i++) {
				const t = i / steps;
				const a = (1 - t) * (1 - t);
				const b = 2 * (1 - t) * t;
				const d = t * t;
				current.push({ x: a * pen.x + b * c.x1 + d * c.x, y: a * pen.y + b * c.y1 + d * c.y });
			}
			pen = { x: c.x, y: c.y };
		} else if (c.type === 'C') {
			for (let i = 1; i <= steps; i++) {
				const t = i / steps;
				const a = (1 - t) ** 3;
				const b = 3 * (1 - t) ** 2 * t;
				const e = 3 * (1 - t) * t * t;
				const d = t ** 3;
				current.push({
					x: a * pen.x + b * c.x1 + e * c.x2 + d * c.x,
					y: a * pen.y + b * c.y1 + e * c.y2 + d * c.y
				});
			}
			pen = { x: c.x, y: c.y };
		} else if (current.length > 0) {
			pen = current[0];
		}
	}
	if (current.length > 1) polylines.push(current);
	return polylines;
}

export function emptyBox(): Box {
	return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

export function polylinesBox(polylines: readonly (readonly Point[])[]): Box {
	return polylines.flat().reduce(
		(box, p) => ({
			minX: Math.min(box.minX, p.x),
			minY: Math.min(box.minY, p.y),
			maxX: Math.max(box.maxX, p.x),
			maxY: Math.max(box.maxY, p.y)
		}),
		emptyBox()
	);
}

export function pathBox(commands: readonly PathCommand[]): Box {
	return polylinesBox(flattenPath(commands));
}

export function translatePath(commands: readonly PathCommand[], dx: number, dy: number): PathCommand[] {
	return commands.map((c): PathCommand => {
		if (c.type === 'Z') return c;
		if (c.type === 'Q') return { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x: c.x + dx, y: c.y + dy };
		if (c.type === 'C')
			return { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x2: c.x2 + dx, y2: c.y2 + dy, x: c.x + dx, y: c.y + dy };
		return { ...c, x: c.x + dx, y: c.y + dy };
	});
}

/** Gerade-ungerade-Regel: liegt der Punkt innerhalb der geschlossenen Polygonzüge? */
export function isInside(p: Point, polylines: readonly (readonly Point[])[]): boolean {
	let inside = false;
	for (const poly of polylines) {
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const a = poly[i];
			const b = poly[j];
			if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
				inside = !inside;
			}
		}
	}
	return inside;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lengthSq = dx * dx + dy * dy;
	const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
	return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Abstand zur nächsten Kante der geschlossenen Polygonzüge. */
export function distanceToEdge(p: Point, polylines: readonly (readonly Point[])[]): number {
	let best = Infinity;
	for (const poly of polylines) {
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			best = Math.min(best, distanceToSegment(p, poly[j], poly[i]));
		}
	}
	return best;
}

/** Vorzeichenbehafteter Abstand: positiv innen, negativ außen. */
export function signedDistance(p: Point, polylines: readonly (readonly Point[])[]): number {
	const d = distanceToEdge(p, polylines);
	return isInside(p, polylines) ? d : -d;
}

function formatNumber(value: number, precision: number): string {
	const fixed = value.toFixed(precision);
	const trimmed = fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
	return trimmed === '-0' ? '0' : trimmed;
}

export function svgPathData(commands: readonly PathCommand[], precision = 3): string {
	const n = (v: number): string => formatNumber(v, precision);
	return commands
		.map((c) => {
			if (c.type === 'Z') return 'Z';
			if (c.type === 'Q') return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
			if (c.type === 'C') return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
			return `${c.type}${n(c.x)} ${n(c.y)}`;
		})
		.join('');
}

/** Überträgt einen Pfad in einen Canvas-Kontext (skaliert in Pixel). */
export function tracePath(
	ctx: CanvasRenderingContext2D,
	commands: readonly PathCommand[],
	scale: number
): void {
	for (const c of commands) {
		if (c.type === 'M') ctx.moveTo(c.x * scale, c.y * scale);
		else if (c.type === 'L') ctx.lineTo(c.x * scale, c.y * scale);
		else if (c.type === 'Q') ctx.quadraticCurveTo(c.x1 * scale, c.y1 * scale, c.x * scale, c.y * scale);
		else if (c.type === 'C')
			ctx.bezierCurveTo(c.x1 * scale, c.y1 * scale, c.x2 * scale, c.y2 * scale, c.x * scale, c.y * scale);
		else ctx.closePath();
	}
}
