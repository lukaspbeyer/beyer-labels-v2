# Beyer Labels

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

## Einrichtung bei Cloudflare

Der MCP-Server bleibt geschlossen, bis diese Schritte erledigt sind.

1. **Ablage anlegen:** `wrangler kv namespace create FILES` ausführen und die ausgegebene `id` in `wrangler.toml` unter `[[kv_namespaces]]` eintragen.
2. **Eigene Domain:** Dem Worker im Cloudflare-Dashboard eine Subdomain zuweisen (Workers & Pages → Worker → Settings → Domains & Routes), etwa `kura.<domain>`.
3. **Access-Anwendung:** Zero Trust → Access → Applications → „Self-hosted“ für diese Subdomain anlegen. Richtlinie „Allow“ für die Familie. Unter „Advanced settings“ Managed OAuth einschalten, Dynamic Client Registration erlauben und als Redirect-URI `https://claude.ai/api/mcp/auth_callback` zulassen.
4. **Download-Links ausnehmen:** Eine zweite Access-Anwendung für den Pfad `kura.<domain>/d/*` mit der Richtlinie „Bypass“ für alle anlegen.
5. **Service Token für den Bot:** Zero Trust → Access → Service Auth → Service Token anlegen; in der Anwendung aus Schritt 3 eine Richtlinie „Service Auth“ für dieses Token ergänzen. Der Bot sendet die Kopfzeilen `CF-Access-Client-Id` und `CF-Access-Client-Secret`.
6. **Werte eintragen:** In `wrangler.toml` unter `[vars]` `ACCESS_TEAM_DOMAIN` (etwa `<team>.cloudflareaccess.com`) und `ACCESS_AUD` (Application Audience Tag der Anwendung aus Schritt 3) setzen.
7. **Veröffentlichen:** `npm run build`, dann `wrangler deploy`.

Adresse für Agenten: `https://kura.<domain>/mcp`.
