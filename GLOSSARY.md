# Kura

Drucksachen und gravierte Schilder für das Haus der Familie Beyer, alle in einem gemeinsamen Hausdesign.

## Language

### Gestaltung

**Kura**:
Das Hausdesign der Familie Beyer und das einzige Design dieses Systems. Es legt Schrift, Schreibweise, Laufweite, Proportionen und je Medium die Ausprägung fest.
_Avoid_: Vorlage, Preset, Stil, Theme

**Textrolle**:
Eine von Kura festgelegte Art, Text zu setzen. „Zeichen“ ist das einzelne, weit gesperrte Wort; „Text“ ist der Listeneintrag: dieselbe Schreibweise, aber mit geringer Laufweite, damit er sich als Zeile liest.
_Avoid_: Schriftstil, Font-Variante

**Ausprägung**:
Der Teil von Kura, der nur für ein Medium gilt, etwa Gravurverfahren und Kante bei Lärche oder Druckfarbe bei Papier.
_Avoid_: Variante, Theme

**Werkbank**:
Die Seite `/werkbank`, auf der Kura an einer Arbeitskopie verändert und an allen Produkten zugleich geprüft wird. Die Arbeitskopie gilt erst, wenn sie als neue Kura-Definition übernommen ist.
_Avoid_: Editor, Einstellungen

### Herstellung

**Medium**:
Ein Herstellungsweg mit eigener Ausgabe und eigenen Fertigungsgrenzen. Es gibt Lärche-Gravur und Papier-Druck.
_Avoid_: Material, Kanal, Ausgabeformat

**Produkt**:
Eine herstellbare Sache in Kura auf genau einem Medium, mit eigenem Format, eigenen Inhaltsfeldern und eigenen Unterregeln. Produkte sind Holzlabel, Papierlabel und Tagesübersicht.
_Avoid_: Vorlage, Template, Dokumenttyp

**Unterregel**:
Eine Regel eines Produkts, die Kura ergänzt oder aus Kura ableitet, etwa ein festes Format oder eine Obergrenze für Einträge. Eine Unterregel widerspricht Kura nie.
_Avoid_: Ausnahme, Override

**Hinweis**:
Die Meldung, dass ein Inhalt eine Regel von Kura, eine Unterregel oder eine Fertigungsgrenze verletzt, mit der Angabe, was zu ändern ist, und dem Ort im Inhalt (welches Etikett, welcher Tag, welches Feld). Für Agenten sperrt jeder Hinweis die Datei.
_Avoid_: Fehler, Warnung

### Produkte

**Holzlabel**:
Ein Türlabel aus 4 mm Lärche mit einem einzelnen Wort, im Serienformat oder im Langformat.

**Serienformat**:
Das feste Format aller Holzlabels, damit eine Reihe von Fronten einheitlich wirkt. Das Langformat ist die Ausnahme für ein unverzichtbar langes Wort.

**Papierlabel**:
Ein gedrucktes Etikett auf einem Etikettenbogen, mit Wort und optionaler Unterzeile. Ein Bogen trägt ein oder mehrere Etiketten.

**Platz**:
Die Stelle eines Etiketts auf dem Bogen, angegeben als Spalte und Zeile ab 1 von links oben. Freie Plätze bleiben unbedruckt, damit ein angebrochener Bogen weiter genutzt werden kann.
_Avoid_: Position, Zelle, Feld

**Tagesübersicht**:
Ein Blatt A4 hochkant für einen Tag mit festen Zonen und Obergrenzen je Zone. Der Inhalt kommt von einem Agenten oder zum Ausprobieren aus der Seite `/tag`; dieses System speichert ihn nicht.
_Avoid_: Tagesplan, To-do-Liste

**Front**:
Die Möbelfront, auf der ein Holzlabel sitzt. Sie gehört zur Umgebung der Vorschau, nicht zur Gestaltung.
