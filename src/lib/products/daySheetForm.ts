/**
 * Die Tagesübersicht als Formular: Listen als Zeilen, Zahlen als Text. Aus den Feldern entsteht
 * derselbe Inhalt, den ein Agent senden würde; er geht durch dieselbe Prüfung.
 */
import { DAY_SHEET_EXAMPLE, DAY_SHEET_LIMITS, type DaySheetInput } from './daySheet';

const L = DAY_SHEET_LIMITS;

export interface DaySheetFields {
	date: string;
	focus: { text: string; firstStep: string };
	routines: { morning: string; midday: string; evening: string };
	tasks: { text: string; minutes: string }[];
	appointments: { time: string; text: string; leaveAt: string }[];
	remember: string;
}

export const EMPTY_DAY: DaySheetInput = { date: DAY_SHEET_EXAMPLE.date, focus: { text: '', firstStep: '' }, routines: { morning: [], midday: [], evening: [] }, tasks: [], appointments: [], remember: [] };

/** Felder für einen Tag; Aufgaben und Termine haben immer so viele Zeilen, wie das Blatt Plätze hat. */
export function daySheetFields(day: DaySheetInput): DaySheetFields {
	return {
		date: day.date,
		focus: { ...day.focus },
		routines: { morning: day.routines.morning.join('\n'), midday: day.routines.midday.join('\n'), evening: day.routines.evening.join('\n') },
		tasks: Array.from({ length: L.tasks }, (_, i) => ({ text: day.tasks[i]?.text ?? '', minutes: day.tasks[i]?.minutes?.toString() ?? '' })),
		appointments: Array.from({ length: L.appointments }, (_, i) => ({
			time: day.appointments[i]?.time ?? '',
			text: day.appointments[i]?.text ?? '',
			leaveAt: day.appointments[i]?.leaveAt ?? ''
		})),
		remember: day.remember.join('\n')
	};
}

export const fieldLines = (value: string): string[] => value.split('\n');

/** Der Inhalt aus den Feldern, ungeprüft; `parseDaySheet` entscheidet, ob er gilt. */
export function daySheetContent(form: DaySheetFields): unknown {
	return {
		date: form.date,
		focus: form.focus,
		routines: { morning: fieldLines(form.routines.morning), midday: fieldLines(form.routines.midday), evening: fieldLines(form.routines.evening) },
		tasks: form.tasks.map((t) => ({ text: t.text, minutes: Number(t.minutes) || undefined })),
		appointments: form.appointments.filter((a) => a.time || a.text),
		remember: fieldLines(form.remember)
	};
}
