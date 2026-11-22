/** Hinweis: ein Inhalt verletzt eine Regel von Kura, eine Unterregel oder eine Fertigungsgrenze. */
export interface Hint {
	kind: string;
	/** Sagt, was zu ändern ist */
	message: string;
}
