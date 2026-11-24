# Beyer Design Guidelines

Ein Hausdesign für alles, was im Haus beschriftet, gedruckt oder graviert wird: ruhig, klar, wenig.

## Hausdesign Kura

**Kura ist das Hausdesign der Familie Beyer und das einzige Design für alle Produkte**: Holzlabels, Papierlabels und weitere Drucksachen. Die Definition steht in `src/lib/kura/kura.json`; diese Datei und dieser Abschnitt bleiben im Gleichklang.

Kura besteht aus einem **Kern**, der für jedes Produkt gilt (Schrift, Schreibweise, Laufweite, Ausrichtung, Verhältnis von Schrift zu Fläche, Wortschatz), und einer **Ausprägung je Medium** (Lärche: Gravur, Oberfläche, Form, Kante; Papier: Druckfarbe und Signalfarbe). Eine Änderung am Kern gilt immer für alle Produkte. Produkte leiten ihre Maße aus dem Kern ab und ergänzen eigene Unterregeln wie ein festes Format; sie überschreiben Kura nie.

Der Name: *Kura* (蔵) ist das japanische Speicherhaus, der Ort, an dem Vorräte und Wertvolles geordnet lagern. Genau das beschriften die Labels: Schränke, Schubladen, Vorräte.

### Was Kura ausmacht

1. **Holz vor Schrift.** Die Schrift nimmt höchstens etwa die Hälfte der Breite ein, der Rest ist freie Lärchenfläche oder freies Papier. Die Ruhe entsteht aus dieser Fläche, nicht aus der Schrift.
2. **Leise Schrift.** Kleinbuchstaben, dünn, weit gesperrt. Das Wort liest sich wie ein ruhiges Zeichen, nicht wie ein Hinweisschild.
3. **Klarer Kontrast.** Die Gravur ist flach und schwarz gefüllt, der Druck schwarz auf weißem Papier. Damit bleibt die kleine Schrift aus 1–2 m lesbar, ohne groß werden zu müssen.
4. **Ehrliches Material.** Naturbelassene, geölte Lärche mit hell geschliffener Kante, scharfen Ecken, ohne Rahmen und ohne Verkohlung. Das Label sieht aus wie ein Stück Holz, nicht wie ein Laserprodukt.
5. **Serie statt Einzelstück.** Alle Labels haben dasselbe Format. Nur das Wort ändert sich. Eine Reihe von Fronten wirkt dadurch geordnet und gewollt.
6. **Ein kurzes Wort.** Ein Begriff, klein geschrieben, ohne Unterzeile, ohne Artikel. Lange Wörter werden durch kurze ersetzt (siehe Wortschatz).
7. **Eine Sache trägt das Blatt.** Wo ein Blatt mehr als ein Wort trägt, ist eines sehr groß (die Tageszahl der Tagesübersicht) und alles andere klein. Gegliedert wird über Größe, Abstand und feine Linien.
8. **Rot nur als Signal.** Neben Schwarz gibt es auf Papier genau eine Farbe, ein Rot. Es markiert nur die Hauptsache eines Blatts und trägt nie allein eine Information: Was rot ist, ist auch durch Größe oder Stellung hervorgehoben. So verliert ein Schwarzweißdruck nichts.

### Warum Kura zum Haus passt

- **Lärche ist das durchgehende Material des Hauses:** Fenster, Türzargen und die Kanten der Küchenfronten. Ein Lärchenlabel mit heller Kante setzt diese Linie fort und wirkt wie ein Teil des Möbels.
- **Die Fronten sind graugrün (Agave), grifflos und ruhig;** dazu Lehmputz, eine helle Holzdecke, dunkler Steinboden und außen Schiefer. Schwarz gefüllte Schrift nimmt die schwarze Arbeitsplatte, den Boden und den Schiefer auf.
- **Vorbild sind japanische Hausschilder aus Holz:** naturbelassenes Holz, scharfe Ecken, saubere Kanten, kleine, weit gesperrte Schrift, meist schwarz gefüllt, viel freie Fläche. Kura überträgt diese Haltung auf kleine Labels für Schränke.
- **Kleinbuchstaben statt Versalien:** Im direkten Vergleich mit Jost in Versalien wirkt die Kleinschrift leiser und moderner; Ober- und Unterlängen geben dem Wort eine eigene Gestalt.
- **Jost statt Sora:** Jost ist eine geometrische Grotesk mit Futura-Anmutung (einstöckiges a) und kommt den Vorbildern am nächsten.
- **Vorbild für die Tagesübersicht sind Drucksachen von Muji:** eine große Zahl trägt das Blatt wie am Abreißkalender, Rot steht nur als Signal. Eine Fassung ganz nach diesem Vorbild, mit Inter Tight in Versalien und Text in gewohnter Schreibweise, ist ausprobiert und kurz eingesetzt worden (lukaspbeyer/beyer-labels-v2#6). Die Schrift wirkte darin weniger modern als Jost in Kleinbuchstaben. Übernommen sind deshalb nur der Kopf der Tagesübersicht, die Signalfarbe und die feinen Linien von 0,2 mm; die Schrift bleibt Jost.
- **Festes Querformat statt Kompakt oder Quadrat:** Kompakt verliert die freie Fläche und wirkt wie ein Etikett aus dem Drucker. Ein Quadrat wirkt auf einer großen Front wie ein aufgesetztes Objekt. Das Querformat nimmt die waagerechten Kanten der Fronten und die waagerechte Maserung auf.
- **Größe zwischen leisem Detail und ausgewogen:** auf einer 50–60 cm breiten Front etwa ein Zehntel der Breite; aus der Nähe ein Detail, aus 1–2 m lesbar.

### Spezifikation

Kern (gilt für jedes Produkt):

| Merkmal | Kura |
|---|---|
| Schrift | Jost Regular (400) |
| Zeichen (das einzelne Wort, auch Überschriften von Zonen) | Kleinbuchstaben, Laufweite 22 %; allein auf der Fläche mittig, neben Text an dessen Kante |
| Text (Listeneinträge, Angaben) | Kleinbuchstaben wie das Zeichen, Laufweite 8 %, linksbündig; Überschriften von Zonen stehen ebenfalls links |
| Versalhöhe | 9,375 % der Breite der Fläche, höchstens 25 % ihrer Höhe |
| Breite des Zeichens | höchstens 70,3 % der Breite der Fläche |
| Unterzeile | 55 % der Versalhöhe, Abstand 0,6 Versalhöhen, gesetzt wie das Zeichen; je Produkt erlaubt oder nicht |

Ausprägung Lärche:

| Merkmal | Kura |
|---|---|
| Material | Lärche, 4 mm, Maserung waagerecht |
| Form | Rechteck, Eckradius 0 mm, ohne Rahmenlinie |
| Kante | hell geschliffen (nach dem Laserschnitt schleifen oder Platte sägen und nur gravieren) |
| Oberfläche | geölt |
| Gravur | flach, schwarz gefüllt |

Ausprägung Papier:

| Merkmal | Kura |
|---|---|
| Papier | Weiß |
| Druckfarbe | Schwarz |
| Signalfarbe | Rot (#e4402b), nur für die Hauptsache eines Blatts; nie allein Träger einer Information, damit Schwarzweißdruck nichts verliert |
| Gliederung | nur über Größe, Abstand und feine Linien (0,2 mm) |
| Lesegröße | Versalhöhe 3,4 mm für Text |

Produkt Holzlabel (Unterregeln):

| Merkmal | Holzlabel |
|---|---|
| Format | Serienformat 64 × 24 mm, fest für alle Wörter |
| Inhalt | ein Wort, keine Unterzeile |
| Daraus abgeleitet | Versalhöhe 6 mm, Wort höchstens 45 mm breit, links und rechts mindestens 9,5 mm Holz |
| Vorschau | Front Agave (graugrün), wahlweise Anthrazit oder Columba Grey |

Langformat für die seltene Ausnahme eines unverzichtbar langen Wortes (etwa „servietten“): 90 × 24 mm, Versalhöhe weiter 6 mm, Wort höchstens 63,3 mm breit.

Produkt Papierlabel (Unterregeln):

| Merkmal | Papierlabel |
|---|---|
| Formate | Etikett 105 × 74 mm (Bogen A4 hoch, 2 × 4), Schild 210 × 100 mm (A5 quer, oben) |
| Inhalt | je Etikett ein Wort, Unterzeile erlaubt; ein Bogen trägt ein oder mehrere Etiketten, freie Plätze bleiben unbedruckt |
| Daraus abgeleitet | Versalhöhe 9,8 mm (Etikett) und 19,7 mm (Schild), Wort höchstens 73,8 mm und 147,7 mm breit |
| Druck | in Originalgröße (100 %), Schwarz |

Produkt Tagesübersicht (Unterregeln):

| Merkmal | Tagesübersicht |
|---|---|
| Format | A4 hoch, Rand 18 mm, ein Blatt je Tag |
| Zonen, immer in dieser Reihenfolge | Wochentag und Datum · heute wichtig mit erstem Schritt · morgens, mittags, abends · außerdem · termine · mitnehmen |
| Obergrenzen | eine Hauptsache, je Tagesabschnitt 4 Routinen, 3 weitere Aufgaben, 4 Termine, 3 Dinge zum Mitnehmen |
| Einträge | jeder Eintrag eine Zeile; zu lange Einträge werden gemeldet, nicht umbrochen |
| Kopf | wie ein Abreißkalender: die Tageszahl groß am linken Rand, auf ihrer Grundlinie daneben Wochentag (als Zeichen) und Monat mit Jahr, oben rechts die Kalenderwoche, darunter eine Linie über die ganze Breite |
| Fluchtlinie | eine für allen Text unter dem Kopf: Überschriften, Hauptsache, erster Schritt, Einträge, die Sache der Termine und Mitnehmen beginnen an derselben Linie. Kästchen und Uhrzeiten hängen links davor, Dauer und „los“-Zeit stehen am rechten Rand. Die zweite und dritte Spalte der Routinen haben je ihre eigene Linie. Linien laufen über die ganze Breite |
| Erster Schritt | Unterzeile der Hauptsache: kleine Beschriftung und Eintrag auf einer Grundlinie, ohne eigene Linie |
| Signalfarbe | Überschrift und Kästchen von „heute wichtig“, das Kästchen in doppelter Linienstärke; die Hauptsache selbst bleibt schwarz und ist durch ihre Größe hervorgehoben |
| Daraus abgeleitet | Tageszahl 10-fache Lesegröße (34 mm), Wochentag und Monat 1,15-fache Lesegröße, Hauptsache 1,55-fache Lesegröße, Überschriften 0,72-fache Lesegröße; die Fluchtlinie liegt so weit vom Rand, wie die breiteste Uhrzeit und ein Abstand brauchen (gut 35 mm vom Blattrand); das Kästchen der Hauptsache wächst mit ihr (1,1-fache ihrer Versalhöhe) |
| Leere Plätze | bei „außerdem“ und „termine“ bleiben die Zeilen zum Schreiben stehen; Routinen zeigen nur, was gilt |

Das Blatt soll beim Anfangen helfen (eine Hauptsache, kleinster erster Schritt), Routinen sichtbar halten und das Zeitgefühl stützen (Dauer je Aufgabe, „los“-Zeit je Termin). Der Inhalt kommt von einem Agenten oder zum Ausprobieren aus der Seite `/tag`; dieses System speichert ihn nicht.

### Wortschatz

Alle Wörter passen in 64 × 24 mm ohne Fertigungswarnung (geprüft mit den Schriftdaten von Jost; längstes Wort „duschgel“, 45 mm).

- **Küche:** teller, schalen, tassen, gläser, besteck, töpfe, pfannen, deckel, backen, bretter, messer, geräte, vorrat, gewürze, öle, tee, kaffee, müsli, nudeln, reis, mehl, zucker, brot, snacks, dosen, folien, tücher, putzen, müll
- **Bad:** tücher, lappen, zähne, haare, pflege, kosmetik, rasur, seife, duschgel, shampoo, föhn, medizin, pflaster, papier, putzen, bürsten, vorrat, wäsche
- **Schlafzimmer:** bettzeug, decken, kissen, wäsche, socken, pyjamas, pullover, shirts, hosen, hemden, schals, mützen, gürtel, schmuck, uhren, schuhe, sport, bücher, papiere, kabel, koffer, winter, sommer

Kurze Wörter statt langer:

| Statt | Kura |
|---|---|
| waschlappen | lappen |
| unterwäsche | wäsche |
| handtücher | tücher |
| zahnpflege | zähne |
| haarpflege | haare |
| hautpflege | pflege |
| bettwäsche | bettzeug |
| dokumente | papiere |
| putzmittel | putzen |
| konserven | dosen |
| ladekabel | kabel |
| klopapier | papier |

Neue Wörter: in `/holz` eingeben. Erscheint ein Hinweis, ist das Wort zu lang; dann ein kürzeres wählen.

### Noch abzugleichen

Farbtöne und Tiefen der Vorschau sind Schätzwerte. Nach einer Testgravur auf dem xTool die Füllung auf geschliffener Lärche und den Farbton der Agave-Front in `src/lib/utils/wood/calibration.json` anpassen.
