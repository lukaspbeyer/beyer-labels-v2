# Produktseiten ohne gemeinsamen Seitenkern

Die Produktseiten `/holz`, `/papier` und `/tag` teilen sich nur die Schrift (`useFont`), den Aufruf von `set` und den Download (`utils/download.ts`). Weitere gemeinsame Teile ziehen wir nicht in ein eigenes Modul zusammen. Alles Übrige unterscheidet sich absichtlich je Produkt: wie eine Seite den Ort eines Hinweises nennt (Platz auf dem Bogen oder Feldpfad), ob ein Hinweis den Download sperrt (nur `/tag`) und ob der letzte Satz stehen bleibt, während die Schrift lädt oder die Form verletzt ist. Ein gemeinsamer Seitenkern würde diese Unterschiede nur in Parameter verschieben. Die eigentliche Arbeit liegt schon im `set` des Produkts und in den Medien.

## Considered Options

- Ein Rune-Modul je Seite für „Kura mit Schrift, Inhalt → Satz, Hinweise in Seitenworten, Download“: verworfen im Architektur-Review vom November 2026, nachdem die Produktdefinition die Stücke und die Medien Datei und Vorschau übernommen hatten. Übrig blieben rund 20 Zeilen, die sich auf drei Seiten ähneln. Ein kleiner Helfer für den Download mit Belegt-Zustand in `utils/download.ts` bleibt erlaubt.
