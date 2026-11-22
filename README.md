# Kura

Drucksachen und gravierte Schilder für das Haus, alle im Hausdesign **Kura**.

- `/holz`: Holzlabel aus Lärche, 3D-Vorschau und SVG für den Laser
- `/`: Kura-Werkbank mit allen Produkten
- `/papier`: Papierlabel auf dem Etikettenbogen, PDF für den Druck
- `/mcp`: MCP-Server für Agenten (Produkte auflisten, Produkt erzeugen)

Kura steht in `src/lib/kura/kura.json`; Begriffe in `GLOSSARY.md`, tragende Entscheidungen in `docs/adr/`, Gestaltung in `BEYER-DESIGN-GUIDELINES.md`, Arbeitsanleitung für den Code in `CLAUDE.md`.

```bash
npm install
npm run dev        # Entwicklungsserver
npm run check      # Typprüfung
npm run test:run   # Tests
npm run build      # Build für Cloudflare Workers
wrangler deploy    # Veröffentlichen
```

## Betrieb bei Cloudflare

Adresse: `https://kura.lukasbeyer.com`, für Agenten `https://kura.lukasbeyer.com/mcp`. Die `workers.dev`-Adresse ist abgeschaltet.

| Was | Wo |
|---|---|
| Worker | `kura`, eigene Domain `kura.lukasbeyer.com` |
| Dateiablage | KV-Namespace `kura-files`, Bindung `FILES` |
| Anmeldung | Access-Anwendung „Kura“ mit der Richtlinie „lukas-and-tran“ und Managed OAuth (Redirect-URI für claude.ai zugelassen) |
| Download-Links | Access-Anwendung „Kura · Download-Links“ für `/d/*` mit „Bypass“ |

Veröffentlichen: `npm run build`, dann `wrangler deploy`.

**Zugang für einen Bot ohne Browser:** Zero Trust → Access → Service Auth → Service Token anlegen, dann in der Anwendung „Kura“ eine Richtlinie „Service Auth“ für dieses Token ergänzen. Der Bot sendet die Kopfzeilen `CF-Access-Client-Id` und `CF-Access-Client-Secret`.
