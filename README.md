# Beyer Labels

Drucksachen und gravierte Schilder für das Haus, alle im Hausdesign **Kura**.

- `/holz`: Holzlabel aus Lärche, 3D-Vorschau und SVG für den Laser
- `/papier`: Papierlabel auf dem Etikettenbogen, PDF für den Druck

Kura steht in `src/lib/kura/kura.json`; Begriffe in `GLOSSARY.md`, tragende Entscheidungen in `docs/adr/`, Gestaltung in `BEYER-DESIGN-GUIDELINES.md`, Arbeitsanleitung für den Code in `CLAUDE.md`.

```bash
npm install
npm run dev        # Entwicklungsserver
npm run check      # Typprüfung
npm run test:run   # Tests
npm run build      # Build für Cloudflare Workers
wrangler deploy    # Veröffentlichen
```
