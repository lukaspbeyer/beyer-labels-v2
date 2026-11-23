/**
 * Hinweis: ein Inhalt verletzt eine Regel von Kura, eine Unterregel oder eine Fertigungsgrenze.
 * Der Ort steht als Daten am Hinweis, nicht im Text; so kann ein Agent ihn als Feldpfad lesen
 * und eine Seite ihn in ihren eigenen Worten nennen.
 */
export interface Hint {
	kind: string;
	/** Wo im Inhalt, von außen nach innen: Feldnamen und Stellen ab 0, etwa ['days', 1, 'tasks', 0, 'text']. Leer: der Inhalt als Ganzes. */
	at: readonly (string | number)[];
	/** Sagt, was zu ändern ist */
	message: string;
}

export function hint(kind: string, message: string, at: Hint['at'] = []): Hint {
	return { kind, at, message };
}

/** Hinweise eines Teils an ihren Ort im Ganzen setzen, etwa die eines Tages unter ['days', 1]. */
export function within(outer: Hint['at'], hints: readonly Hint[]): Hint[] {
	return hints.map((h) => ({ ...h, at: [...outer, ...h.at] }));
}

/** Der Ort als Feldpfad, wie ihn ein Agent im Inhalt wiederfindet: days[1].tasks[0].text */
export function fieldPath(at: Hint['at']): string {
	return at.reduce<string>((path, part) => (typeof part === 'number' ? `${path}[${part}]` : path ? `${path}.${part}` : part), '');
}

/** Der Hinweis als eine Zeile mit Feldpfad, für Agenten und überall, wo der Inhalt Felder hat. */
export function hintText(h: Hint): string {
	const path = fieldPath(h.at);
	return path ? `${path}: ${h.message}` : h.message;
}
