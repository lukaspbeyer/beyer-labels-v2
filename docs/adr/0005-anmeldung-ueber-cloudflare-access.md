# Anmeldung über Cloudflare Access, Download-Links ohne Anmeldung

Seiten und MCP-Endpunkt liegen hinter Cloudflare Access: Agenten mit Browser melden sich über Managed OAuth an, der Grok-Bot ohne Browser über ein Service Token. Der Worker prüft das Access-Token zusätzlich selbst und hält `/mcp` geschlossen, solange Access nicht eingerichtet ist; so öffnet ein Fehler in der Access-Konfiguration nichts. Erzeugte Dateien sind dagegen 24 Stunden ohne Anmeldung über einen nicht erratbaren Link abrufbar, weil ein Login vor jedem Tagesblatt genau die Hürde wäre, die das Blatt abbauen soll.

## Considered Options

- Ein geheimes Token im Worker: einfacher, aber ohne einzeln widerrufbare Zugänge und ohne Anmeldung für claude.ai.
- Eigener OAuth-Server im Worker (`workers-oauth-provider`): braucht zusätzlichen Speicher und eigene Zustimmungsseiten für denselben Nutzen.

## Consequences

Die Access-Anwendung muss `/d/*` von der Anmeldung ausnehmen. Managed OAuth war bei der Entscheidung (November 2026) eine offene Beta; das Zusammenspiel mit claude.ai ist nicht ausdrücklich dokumentiert und beim Einrichten zu prüfen.
