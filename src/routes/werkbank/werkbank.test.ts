import { describe, expect, it } from 'vitest';
import { KURA_OPTIONS } from '$lib/kura/kura';
import page from './+page.svelte?raw';

describe('Werkbank', () => {
	it('hat für jedes Auswahlfeld von Kura eine Auswahl mit den Namen aus Kura', () => {
		const missing = Object.keys(KURA_OPTIONS).filter((path) => !page.includes(`kuraChoices('${path}')`));
		expect(missing).toEqual([]);
	});

	it('schreibt keine Namen von Kura-Werten selbst', () => {
		// Eine Auswahlliste mit eigenen Namen ({ value: 'left', label: 'Links' }) gehört nach KURA_OPTION_NAMES
		const own = Object.values(KURA_OPTIONS)
			.flat()
			.filter((value) => page.includes(`value: '${value}'`));
		expect(own).toEqual([]);
	});
});
