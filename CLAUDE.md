# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kura: printed matter and engraved signs for the Beyer family home, all in one house design, **Kura**. Mobile-optimized web application, built with SvelteKit v2 and deployed on Cloudflare Workers.

Read `GLOSSARY.md` for the domain terms (Kura, Textrolle, Ausprägung, Medium, Produkt, Unterregel, Hinweis) and `docs/adr/` for the decisions that must not be re-litigated. The design itself is described in `BEYER-DESIGN-GUIDELINES.md`.

Three levels with one-way dependencies (ADR 0001):

- **Design** (`src/lib/kura`): Kura, the only design. Knows nothing but itself and the typesetting vocabulary.
- **Medium** (`src/lib/media`): a way of making things, with its own output and fabrication limits. `wood` = larch engraving (laser SVG, 3D preview), `paper` = paper print (PDF).
- **Product** (`src/lib/products`): a makeable thing in Kura on one medium, with its own format, content fields and sub-rules. Products derive from Kura and never override it (ADR 0002).

Products today:
- **Holzlabel** (`/holz`): door label of 4 mm larch, engraved with a CO₂ laser (xTool X1).
- **Papierlabel** (`/papier`): printed label on a label sheet.
- **Tagesübersicht** (no page of its own; example on the workbench): one A4 portrait sheet per day, ADHD-friendly, content supplied by an agent.

The **Kura workbench** at `/` shows every product in the current design and lets you try changes on a working copy.

Agents order products through the **MCP server** at `/mcp` (list products, render product). The system stores no content (ADR 0004); a generated file stays available for 24 hours under an unguessable link. Access is controlled by Cloudflare Access (ADR 0005).

## Commands

```bash
npm install
npm run dev           # Vite dev server
npm run build         # Production build with the Cloudflare adapter
npm run preview       # Preview the production build
npm run check         # svelte-check with TypeScript
npm run test:run      # Vitest (jsdom)
wrangler deploy       # Deploy to Cloudflare Workers

# Larch texture (Python with Pillow and NumPy)
python3 scripts/build-larch-texture.py <photo>   # writes static/textures/laerche-*.jpg
```

## Tech Stack

- **Runtime**: Cloudflare Workers; **Framework**: SvelteKit v2 with TypeScript (Svelte 5 runes in components)
- **Styling**: Tailwind CSS v4, tokens in `src/app.css`
- **Fonts as paths**: opentype.js parses the local font files; all output text is glyph outlines, never live text
- **3D preview**: three.js, loaded dynamically in the browser on `/holz` only
- **PDF**: `@cantoo/pdf-lib` (maintained fork of pdf-lib), loaded dynamically in the browser when a PDF is requested
- **MCP**: `@modelcontextprotocol/server` (official SDK v2, stateless Streamable HTTP) with `zod` for the tool input; `jose` verifies the Access token
- **Build**: Vite + SvelteKit with `@sveltejs/adapter-cloudflare`

## Project Structure

```
src/
├── app.css                    # Tailwind and UI tokens
├── fonts.css                  # @font-face rules for the local fonts
├── routes/
│   ├── +layout.svelte         # Imports app.css
│   ├── +page.svelte           # Kura workbench: working copy of Kura, examples of all products
│   ├── holz/+page.svelte      # Product page wood label
│   ├── papier/+page.svelte    # Product page paper label
│   ├── mcp/+server.ts         # MCP endpoint (checks Access, wires fonts and file store)
│   └── d/[key]/[name]/        # Download of a generated file, no sign-in, 24 hours
├── hooks.server.ts            # Requires a valid Access token for pages once Access is configured
└── lib/
    ├── kura/                  # kura.json (the design), kura.ts (validation, derivation rules), vocabulary.ts
    ├── typesetting/           # Shared by all media: fonts, line and block setting, geometry, mm formatting
    ├── media/
    │   ├── wood/              # Larch engraving: layout, checks, surface, scene, svgExport, calibration
    │   └── paper/             # Paper print: page model with SVG preview, PDF output
    ├── products/              # woodLabel.ts, paperLabel.ts, daySheet.ts, registry.ts (workbench), orders.ts (agents), hint.ts
    ├── server/                # mcp.ts (tools), files.ts (24 h store), access.ts (Cloudflare Access)
    ├── components/            # SiteHeader, ControlGroup, Segmented, Slider; wood/ (WoodControls, WoodPreview)
    ├── stores/wood.ts         # Input of the wood label page; engraving settings are derived
    ├── types/opentype.d.ts    # Types for the used part of opentype.js
    └── utils/result.ts        # Result<T, E> for expected errors
static/fonts/<font>/           # Local WOFF files (latin, three weights per font) + OFL.txt
static/textures/               # Larch texture, latewood map, nachweis.txt (CC BY 2.0)
docs/adr/                      # Architecture decisions
```

Aliases: `$lib`, `$components`, `$stores`, `$utils`.

## Kura (`src/lib/kura`)

`kura.json` is the single design definition (ADR 0003): typeface, the text roles „Zeichen“ (`sign`: the single tracked word, also zone headings) and „Text“ (`text`: list entries; its alignment also places zone headings), proportion rules, sub line, and one expression per medium (`wood`; `paper` with ink, reading size and rule width). A design change is a change to this file plus the matching section in `BEYER-DESIGN-GUIDELINES.md`; keep both in sync.

- `parseKura(raw)` validates a definition and reports all violations at once; `KURA` is the validated current design.
- `signCapHeight(kura, width, height)`: cap height of the word on a surface, proportional to the width, capped by the height.
- `maxSignWidth(kura, width)`: the widest the word may be.
- `applyCase`: Kura writes the word in lower case.
- `KURA_OPTIONS` and `KURA_RANGES`: allowed values; validation and the workbench controls both read them.
- `vocabulary.ts`: the Kura vocabulary (short words for cupboards and drawers).

**Workbench** (`src/routes/+page.svelte`): edits a working copy in the browser only. Every registered product is redrawn with the working copy and shows its hints; the wood label card also reports vocabulary words that no longer fit. A change takes effect only when the downloaded `kura.json` is committed. Product pages always use the committed `KURA`.

There are no presets and no design controls on product pages. Never put a design value (font, tracking, size ratio, colour) into a product or a page; change Kura instead.

## Products (`src/lib/products`)

Each product module holds its formats, its input type, the derivation from Kura and its hints (`Hint`: kind and a message saying what to change).

**Day sheet** (`daySheet.ts`): fixed zones in fixed order (weekday and date, heute wichtig with erster Schritt, morgens/mittags/abends, außerdem, termine, mitnehmen) with limits per zone (`DAY_SHEET_LIMITS`). `parseDaySheet(raw)` validates content from outside and reports every violation; `layoutDaySheet` sets the sheet and reports entries that are too long (`too-long`, never wrapped) and characters the font lacks (`character`). All sizes are multiples of Kura's reading size. The zones keep their place on an empty day. The layout is a first draft that still needs feedback from its user.

**Registry** (`registry.ts`): `PRODUCTS` lists every product with examples drawn for a given Kura. A new product registers here and then appears on the workbench without further changes. Every product must be free of hints in the committed Kura (tested).

**Wood label** (`woodLabel.ts`): formats series 64 × 24 mm and long 90 × 24 mm; one word, no sub line. `woodLabelSettings(kura, input)` builds the engine's `WoodSettings`; the cap height follows the series format so the long format carries the same type. `checkWoodLabel` returns the fabrication warnings plus the Kura rule for the word width (`sign-width`). Every word of the Kura vocabulary must stay free of hints in the series format (tested).

**Paper label** (`paperLabel.ts`): formats label 105 × 74 mm (A4 portrait sheet, 2 × 4) and sign 210 × 100 mm (A5 landscape, top); one word, sub line allowed. `layoutPaperLabel` sets the lines, `checkPaperLabel` returns `sign-width` and `sub-width`, `paperLabelPage` places the label at its position on the sheet. The cell borders are shown in the preview only and are not printed.

## Typesetting (`src/lib/typesetting`)

All lengths in mm, y down. `fonts.ts`: ten free fonts (OFL) in `FONT_CATALOG`, each with three weights; `createFontLoader(fetchFn)` loads and caches; cap height is measured from the glyph H, the thinnest stroke per font and weight from I, H, E, O, n, o, e. `line.ts` sets one line glyph by glyph (kerning, tracking, no ligatures). `block.ts` stacks lines and centres the block in a rectangle. `geometry.ts` builds and measures paths. Tests load fonts through `testFonts.ts`.

## Medium larch engraving (`src/lib/media/wood`)

Pipeline per change:
1. `layout.ts` sets main and sub line, determines the size and places the text.
2. `checks.ts` returns fabrication warnings: cap height, thinnest stroke, margin to edge/frame/inverse rim, size limit.
3. `surface.ts` rasterises engraving, outline and larch texture and computes albedo, normal and roughness maps. After a change a quick frame (`render.quickPxPerMm`) appears first, full resolution follows after `render.refineDelayMs` without further change.
4. `scene.ts` (three.js) shows the extruded 4 mm label on the furniture front. Without WebGL, `WoodPreview` shows a flat lit top view (`shadeFlat`).
5. `svgExport.ts` writes the laser file.

The engine supports more than Kura uses today (inverse engraving, frame, pill, oval, automatic size); the workbench can set all of it except the size. Engine tests use `testSettings.ts` (Sora capitals, dark engraving, automatic size) as a fixed base independent of Kura.

**Calibration**: colours, depths, gloss, light, layout padding and warning thresholds are in `calibration.json` (typed in `calibration.ts`). Adjust there after a test engraving. The front colours (Agave, Anthrazit, Columba Grey) are estimates. The front is the surroundings of the preview, not part of the design.

**SVG contract**: `width`/`height` in mm, `viewBox` 1 unit = 1 mm, text only as paths. Layers by colour: `g#gravur` black fill (engraving; inverse = field minus text, `evenodd`), `g#rahmen` blue `#0000FF` stroke (frame line), `g#schnitt` red `#FF0000` stroke (cut). File name `holzlabel-<text>-<w>x<h>mm.svg`.

**Texture**: `static/textures/laerche-farbe.jpg` and `laerche-spaetholz.jpg` are built from a photo of planed larch boards (source and licence in `nachweis.txt`; the credit is shown on the page). For own photos adjust `CROPS` in the script and `woodTexture` in `calibration.json`.

**Diagnostics**: the preview element carries `data-mode` (`3d`, `fallback`, `loading`, `error`), `data-render-count`, `data-render-quality` (`quick`, `full`) and `data-render-ms`.

## Medium paper print (`src/lib/media/paper`)

`page.ts`: a `PrintPage` is a size in mm and a list of filled or stroked paths; `pageSvg` draws it for the preview. `pdf.ts`: `renderPdf(pages, ink, title)` writes one PDF page per `PrintPage`, true to size in mm (1 mm = 72/25.4 pt, stroke widths in mm). It runs in the browser and in the Worker (verified with `wrangler dev`). Print in one colour, the ink from Kura.

## Orders and MCP server

`products/orders.ts` is what agents see: `listProducts()` returns per product its fields, limits, output format and a valid example; `makeProduct(kura, id, content, font)` returns the file (`OrderFile`) or the hints. Any hint means no file. Every example in the list must produce a file, and the list must contain the same products as the workbench registry (both tested). A new product needs an entry in `registry.ts` and in `orders.ts`.

`server/mcp.ts` exposes two tools over `createMcpHandler` (a fresh server per request, no session): `list_products` and `render_product({ product, content })`. The result is a JSON text with `url`, `fileName`, `mimeType`, `validForHours`, plus a `resource_link`; on a rule violation `created: false` with `hints` and `isError`. The day sheet accepts one day or `{ days: [...] }` with up to seven days.

`server/files.ts` stores a file in Workers KV (binding `FILES`) with a TTL of 24 hours under a 48-digit random hex key; `/d/<key>/<name>` serves it without sign-in.

`server/access.ts` verifies `Cf-Access-Jwt-Assertion` against the team's keys and the application's audience (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`). `/mcp` answers 503 while these are unset and 401 without a valid token; only the dev server (`npm run dev`) is open. Never add a switch that opens `/mcp` in production. Once Access is configured, `hooks.server.ts` also requires the token for all pages except `/d/` and `/mcp` (which checks itself).

Local test of the endpoint: `npm run dev`, then POST JSON-RPC to `/mcp` with `Accept: application/json, text/event-stream`. `wrangler dev` runs the built Worker in the real runtime, where `/mcp` stays closed without Access.

## Web UI

Calm, warm style: off-white (`ivory`, `sand`), dark warm grey (`ink`, `ink-muted`), one terracotta accent (`clay`), lines instead of shadows. Tokens in `src/app.css` (`@theme`), UI fonts `font-ui-head` (Sora) and `font-ui-body` (Noto Sans) from `static/fonts`. Every control is at least 44 px; no horizontal scrolling at 360 px. Use Tailwind utility classes; avoid custom CSS. The UI fonts are independent of Kura's typeface.

## Development Notes

- TypeScript everywhere, strict. Expected errors as `Result<T, E>` (`utils/result.ts`).
- Components use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`).
- German for domain comments, test names and user-facing text; identifiers in English.
- `vite.config.ts` sets `ssr.noExternal: ['opentype.js']`: opentype.js ships ESM only via the `module` field, so it is bundled for SSR.
- Verify UI changes in a browser (dev server plus Playwright), not only with tests.

## Deployment (wrangler.toml)

Worker `kura` on the custom domain `kura.lukasbeyer.com`; `workers_dev` is off. `compatibility_flags = ["nodejs_compat"]` (the MCP SDK imports `node:async_hooks`). KV namespace `kura-files` bound as `FILES`; `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` as vars (not secrets). Two Access applications sit in front: „Kura“ (allow policy, Managed OAuth) and „Kura · Download-Links“ (bypass for `/d/*`). Details in `README.md`, section „Betrieb bei Cloudflare“. Deploying publishes to production; do it only when asked.
