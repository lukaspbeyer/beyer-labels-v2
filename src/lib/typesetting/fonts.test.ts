import { describe, expect, it } from 'vitest';
import { nearestWeight } from './fonts';

describe('Schnittwahl', () => {
	it('wählt beim Schriftwechsel den nächsten vorhandenen Schnitt', () => {
		expect(nearestWeight('zen-maru-gothic', 600)).toBe(500);
		expect(nearestWeight('zen-maru-gothic', 700)).toBe(700);
		expect(nearestWeight('sora', 700)).toBe(600);
		expect(nearestWeight('sora', 500)).toBe(500);
	});
});
