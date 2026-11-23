# Das Holzlabel wird zweimal gesetzt

Das Holzlabel setzt sein Wort zweimal: einmal über Kuras Textrolle (`setSign` in `src/lib/kura/textRole.ts`) für die Hinweise zu fehlenden Zeichen und zur Wortbreite, und einmal in der Gravur (`media/wood/layout.ts`) für Laserdatei und Vorschau. Die Gravur bekommt keine fertig gesetzten Zeilen. Sie stellt den Text innerhalb von Innenabstand, Rahmen und Rand auf und nicht an der Kante der Fläche. Ihre automatische Größe rechnet sie aus den gemessenen Zeilen, bevor sie sie platziert, und ihre Fertigungsprüfung braucht die dünnste Strichstärke je Zeile. Diese Fertigungsgeometrie gehört zum Medium und nicht zu Kura (ADR 0001). Die Tests der Gravur bleiben absichtlich unabhängig von Kura (`testEngraving.ts`). Das doppelte Setzen kostet in der Praxis nichts.

## Considered Options

- Die Gravur nimmt die Zeilen aus der Textrolle: verworfen im Architektur-Review vom November 2026. Entweder hätte Kura die Fertigungsgeometrie des Mediums übernehmen müssen, oder die Gravur hätte ihr eigenes Stapeln und Ausrichten trotzdem behalten. Der zusätzliche Übersetzungsschritt hätte außerdem die Bytes der Laserdatei verändern können.
