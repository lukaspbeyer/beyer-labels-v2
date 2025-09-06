# Beyer Design System Guidelines

Ein minimalistisches Design-System inspiriert von vietnamesisch-japanischer Ästhetik, optimiert für den praktischen Alltag.

## Design-Philosophie

- **Klarheit**: Sofortige Erkennbarkeit und Lesbarkeit
- **Minimalismus**: Nur das Wesentliche, ohne Dekoration
- **Funktion**: Optimiert für Schwarz-Weiß-Laser-Druck
- **Harmonie**: Tatami-Grid (6px) für natürliche Proportionen

## Typografie

### Schriftarten

#### Hauptschrift: Sora
- **Font-Family**: 'Sora', sans-serif
- **Font-Weight**: 400 (Regular)
- **Verwendung**:
  - Headlines & Titel
  - Etiketten-Haupttext
  - Hausnummer
  - Visitenkarte Name

#### Sekundärschrift: Noto Sans
- **Font-Family**: 'Noto Sans', sans-serif
- **Font-Weight**: 400 (Regular)
- **Verwendung**:
  - Fließtext
  - Untertitel & Beschreibungen
  - Cheat Sheet Inhalt
  - Kleine Labels

### Schriftgrößen

| Größe | Verwendung | Beispiel |
|-------|------------|----------|
| 48pt | Hausnummer | "42" |
| 24pt | Überschrift | Haupttitel |
| 18pt | Cheat Sheet Titel | Anleitungen |
| 12pt | Etiketten-Text | "GEWÜRZE" |
| 9pt | Untertitel | "Küche · Regal 2" |

### Typografie-Einstellungen

- **Letter-Spacing**: 0.05em für Großbuchstaben
- **Line-Height**: 1.5 für Fließtext
- **Font-Weight**: 400 (Regular) - NICHT 600!
- **Text-Transform**: Uppercase für Labels

## Farben

### Primärpalette

```css
:root {
  --beyer-primary: #3E342E;    /* Hauptfarbe */
  --beyer-secondary: #7D6B5D;  /* Sekundärfarbe */
  --beyer-accent: #A68B73;     /* Akzentfarbe */
  --beyer-light: #F7F3EE;      /* Hell */
  --beyer-bg: #FDFBF7;         /* Hintergrund */
}
```

### 3-Stufen Grausystem (für Druck)

- **Level 1**: 100% Schwarz (#000000) - Headlines, Haupttext
- **Level 2**: 60% Grau (#666666) - Sekundärtext
- **Level 3**: 30% Grau (#B3B3B3) - Hilfstext, Rahmen

### Optionale Saison-Akzente

- **Frühling**: #E8D5C4
- **Sommer**: #C5D4C0
- **Herbst**: #D4B5A0
- **Winter**: #B8C5D6

## Grid & Spacing

### 6px Tatami-Grid

Alle Abstände sind Vielfache von 6px, basierend auf japanischen Tatami-Proportionen:

```css
--space-1: 6px;   /* Minimal */
--space-2: 12px;  /* Klein */
--space-3: 18px;  /* Standard */
--space-4: 24px;  /* Medium */
--space-6: 36px;  /* Groß */
--space-8: 48px;  /* Extra Groß */
```

### Padding-Regeln

- **Etiketten**: 16px (luftig für bessere Lesbarkeit)
- **Cheat Sheets**: 24px Außen, 12px zwischen Elementen
- **Visitenkarten**: 18px rundum
- **Cards/Container**: 24px (--space-4)

## Etiketten-System

### Spezifikationen

- **Format**: 105×74mm (8 Stück auf A4, 2×4 Grid), 210x100 (1 Stück Querformat auf A5, 1x1 Grid)
- **Schrift**: Sora 14pt, Uppercase
- **Padding**: 16px (entspricht Tatami-Grid)
- **Icons/Piktogramme**: Minimalistische, funktionale Piktogramme erlaubt
- **Icon-Stil**: Grayscale, hoher Kontrast, geometrisch
- **Randlos**: Keine Borders auf den Labels

### Text-Hierarchie

| Element | Schrift | Größe | Farbe | Stil |
|---------|---------|-------|-------|------|
| Haupttext | Sora | 12pt | 100% Schwarz | Uppercase, LS 0.05em |
| Untertitel | Noto Sans | 9pt | 60% Grau | Normal |

## UI-Komponenten

### Buttons

```css
.btn {
  padding: 16px;
  font-size: 16px;
  font-weight: 400;  /* NICHT 600! */
  border-radius: 8px;
  background: var(--beyer-accent);
}
```

### Input-Felder

```css
input[type="text"] {
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 8px;
  -webkit-appearance: none;  /* Wichtig für einheitliches Styling */
}
```

### Cards

```css
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}
```

## Druck-Richtlinien

### Drucker-Einstellungen

- **Drucker**: SW-Laser empfohlen
- **Qualität**: 600 dpi minimum
- **Papier**: Matt, 80-100g/m²
- **Farbe**: 100% Schwarz (kein Composite)
- **Randlos**: Für Etiketten

### Empfohlene Etiketten-Bögen

- Avery Zweckform 3490 (70×37mm)
- Avery Zweckform 4781 (63.5×38.1mm)
- Printation 105×74mm (transparent)

## Web-Implementation

### CSS Custom Properties

```css
:root {
  /* Farben */
  --primary: #3E342E;
  --secondary: #7D6B5D;
  --accent: #A68B73;
  --light: #F7F3EE;
  --bg: #FDFBF7;
  
  /* Spacing (6px Grid) */
  --space-1: 6px;
  --space-2: 12px;
  --space-3: 18px;
  --space-4: 24px;
  --space-6: 36px;
  --space-8: 48px;
  
  /* Sonstiges */
  --border: rgba(0,0,0,0.1);
  --shadow: 0 2px 8px rgba(0,0,0,0.08);
  --radius: 8px;
}
```

### Font Import

```html
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400&family=Noto+Sans:wght@400&display=swap" rel="stylesheet">
```

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Sora', sans-serif;
```

## Design-Prinzipien

1. **Minimalistische Icons**: Erlaubt für Labels/Etiketten, aber nur wenn funktional
2. **Keine Emojis**: Außer explizit gewünscht
3. **Font-Weight 400**: Niemals 600 für Sora
4. **6px Grid**: Primär für erzeugte Labels und Druckmedien
5. **Minimalismus**: Weniger ist mehr
6. **Druckoptimiert**: SW-Laser kompatibel
7. **Vietnamesisch-Japanische Fusion**: Muji/Aesop-inspiriert

## Anwendungsbeispiele

### Etiketten
```
KÜCHE
Gewürze · Regal 2
```

### Cheat Sheet
```
Waschmaschine Bedienung
1. Wäsche nach Farben sortieren
2. Trommel nicht überfüllen
3. Programm wählen
```

### Hausnummer
```
42
Beyer
```

---

*Beyer Design System v1.0 - Optimiert für Familie Beyer*