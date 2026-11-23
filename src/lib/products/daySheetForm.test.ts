import { describe, expect, it } from 'vitest';
import { DAY_SHEET_EXAMPLE, DAY_SHEET_LIMITS, parseDaySheet } from './daySheet';
import { daySheetContent, daySheetFields, EMPTY_DAY } from './daySheetForm';

describe('Tagesübersicht als Formular', () => {
	it('führt einen Tag durch die Felder unverändert zurück', () => {
		const parsed = parseDaySheet(daySheetContent(daySheetFields(DAY_SHEET_EXAMPLE)));
		expect(parsed.ok && parsed.value).toEqual(DAY_SHEET_EXAMPLE);
	});

	it('hält für Aufgaben und Termine so viele Zeilen bereit, wie das Blatt Plätze hat', () => {
		const fields = daySheetFields(EMPTY_DAY);
		expect([fields.tasks.length, fields.appointments.length]).toEqual([DAY_SHEET_LIMITS.tasks, DAY_SHEET_LIMITS.appointments]);
		const parsed = parseDaySheet(daySheetContent(fields));
		expect(parsed.ok && parsed.value).toEqual(EMPTY_DAY);
	});

	it('reicht zu viele Zeilen und eine Dauer ohne Zahl an die Prüfung weiter', () => {
		const fields = daySheetFields(DAY_SHEET_EXAMPLE);
		fields.routines.morning = 'a\nb\n\nc\nd\ne';
		fields.tasks[0].minutes = 'bald';
		const parsed = parseDaySheet(daySheetContent(fields));
		expect(!parsed.ok && parsed.error.map((h) => h.at)).toEqual([['routines', 'morning']]);
		fields.routines.morning = 'a';
		const again = parseDaySheet(daySheetContent(fields));
		expect(again.ok && again.value.tasks[0]).toEqual({ text: DAY_SHEET_EXAMPLE.tasks[0].text, minutes: undefined });
	});
});
