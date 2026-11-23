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
- **Tagesübersicht** (`/tag`): one A4 portrait sheet per day, ADHD-friendly, content supplied by an agent; the page lets you try it with your own content.

The **overview** at `/` shows one tile per product. The **Kura workbench** at `/werkbank` shows every product in the current design and lets you try changes on a working copy.

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
│   ├── +page.svelte           # Overview: one tile per registered product
│   ├── werkbank/+page.svelte  # Kura workbench: working copy of Kura, examples of all products
│   ├── holz/+page.svelte      # Product page wood label
│   ├── papier/+page.svelte    # Product page paper label (one sheet, several labels)
│   ├── tag/+page.svelte       # Product page day sheet (form, preview, PDF)
│   ├── mcp/+server.ts         # MCP endpoint (wires fonts and file store; access is decided in the hook)
│   └── d/[key]/[name]/        # Download of a generated file, no sign-in, 24 hours
├── hooks.server.ts            # Applies the access rule (`decideAccess`) to every request
└── lib/
    ├── kura/                  # kura.json (the design), kura.ts (validation, derivation rules), textRole.ts (setting text in a text role), vocabulary.ts
    ├── typesetting/           # Shared by all media: fonts, line setting, geometry, mm formatting, file slugs; fontState.svelte.ts (the font of a page)
    ├── media/
    │   ├── wood/              # Larch engraving: layout, checks, surface, surfaceView, scene, svgExport, calibration
    │   └── paper/             # Paper print: page model with SVG preview, PDF output
    ├── products/              # product.ts (what a product is), woodLabel.ts, paperLabel.ts, daySheet.ts (+ daySheetForm.ts), registry.ts (the list), orders.ts (agents), hint.ts
    ├── server/                # mcp.ts (tools), files.ts (24 h store), access.ts (Cloudflare Access, access rule), font.ts (Kura font in the Worker)
    ├── components/            # SiteHeader, StatusCard, ControlGroup, Segmented, Slider; wood/ (WoodControls, WoodPreview, WoodTopView)
    ├── stores/wood.ts         # Input of the wood label page; engraving settings are derived
    ├── types/opentype.d.ts    # Types for the used part of opentype.js
    └── utils/                 # result.ts (Result<T, E> for expected errors), download.ts (save a file from the browser)
static/fonts/<font>/           # Local WOFF files (latin, three weights per font) + OFL.txt
static/textures/               # Larch texture, latewood map, nachweis.txt (CC BY 2.0)
docs/adr/                      # Architecture decisions
```

Aliases: `$lib`, `$components`, `$stores`, `$utils`.

## Kura (`src/lib/kura`)

`kura.json` is the single design definition (ADR 0003): typeface, the text roles „Zeichen“ (`sign`: the single tracked word, also zone headings) and „Text“ (`text`: list entries, lower case like the sign but with little tracking; its alignment also places zone headings), proportion rules, sub line, and one expression per medium (`wood`; `paper` with ink, reading size and rule width). A design change is a change to this file plus the matching section in `BEYER-DESIGN-GUIDELINES.md`; keep both in sync.

- `parseKura(raw)` validates a definition and reports all violations at once; `KURA` is the validated current design.
- `signCapHeight(kura, width, height)`: cap height of the word on a surface, proportional to the width, capped by the height.
- `maxSignWidth(kura, width)`: the widest the word may be.
- `textRole.ts`: the one place where text is set in a text role (`sign` or `text`) and checked against Kura. `roleText(kura, role, text)` applies the role's case (Kura writes lower case); `setRoleLine(kura, font, role, text, capHeight, at)` sets one line with the role's case and tracking, measures its ink width (contour starts at x = 0) and reports characters the font lacks (`character`, they would print as empty boxes); `placeLine(line, align, span, baseline)` places it in a span or at an edge; `setSign(kura, font, surface, sign, sub?, options?)` sets the word with an optional sub line on a surface (cap height from the surface unless given, sub line size and gap, the sign's alignment, or the text role's with `besideText`; centred or `vertical: 'top'`) and adds the width rule (`sign-width`, `sub-width` against `maxSignWidth`). Hints come out in the form of product hints; the caller passes the location `at` as opaque data. Products never apply case, tracking, alignment or these checks themselves.
- `KURA_OPTIONS` and `KURA_RANGES`: allowed values; validation and the workbench controls both read them.
- `KURA_OPTION_NAMES`: the German name of every option and of each of its values (one wording, e.g. `wood.finish` `limed` = „Weiß gekalkt“); its type demands a name for every value in `KURA_OPTIONS` (tested). `kuraChoices(path)` gives the workbench its buttons, `kuraOptionName(path, value)` names a value (the laser SVG's description reads it), `caseInWords(case)` words a letter case for page texts („Kura schreibt es klein“). Never restate these names in a page or medium.
- `kuraChanges(before, after)`: the changed values of a working copy as „path: old → new“.
- The option types of the wood expression (`Process`, `Finish`, …) are defined here; the medium re-exports them (ADR 0001: Kura knows nothing but itself).
- `vocabulary.ts`: the Kura vocabulary (short words for cupboards and drawers).

**Workbench** (`src/routes/werkbank/+page.svelte`): edits a working copy in the browser only. Every registered product is redrawn with the working copy and shows its hints; the wood label card also reports vocabulary words that no longer fit. A change takes effect only when the downloaded `kura.json` is committed. Every option in `KURA_OPTIONS` has a control there with the names from Kura (tested); `paper.ink` has none, paper prints in black. Product pages always use the committed `KURA`. Overview and workbench show the examples in front of their surroundings (`backdrop` of an example: the furniture front for wood, sand for paper). A wood example carries `wood` (layout and settings); `components/wood/WoodTopView.svelte` renders it as a lit top view with the same surface pipeline as `/holz` (`renderSurface`, `shadeFlat`, quick frame first), without three.js, so every larch control of the workbench shows its effect. It carries the same `data-render-*` attributes as the preview and `data-mode` (`sketch`, `surface`).

There are no presets and no design controls on product pages. Never put a design value (font, tracking, size ratio, colour) into a product or a page; change Kura instead.

## Products (`src/lib/products`)

**One module per product** (`product.ts`): a product describes itself once with `defineProduct`: identity (`id`, `name`, `medium`, `nav`, `summary`, `href`), what agents may send (`order(kura)`: description, fields, example; sizes and limits are computed from Kura and the formats, never written as prose), `parse(raw)` (reads content from outside, returns what can still be set plus hints), `set(kura, order, font)` (typesets and checks; returns a `Proof`: hints, file name, `file()`, plus what the page previews) and `examples`. `make` is derived: parse, set, and any hint means no file. Overview, workbench, navigation, the product page and MCP all read this one description. Never compose layout, check, file name and renderer in a caller; call `set`.

**Hint** (`hint.ts`): `kind`, `at` (where in the content, as data: `['days', 1, 'tasks', 0, 'text']`) and `message` (what to change, without the location). `within(outer, hints)` nests the hints of a part; `hintText` renders the field path for agents (`days[1].tasks[0].text: …`). A page may name the location in its own words (the paper label page says „Spalte 2, Zeile 1“). Never glue a location into a message. Fabrication warnings of the wood medium are converted to hints in `woodLabel.ts`; the Kura rules `character`, `sign-width` and `sub-width` come from `kura/textRole.ts` and apply to every product, never from the medium.

An order with several pieces (`labels`, `days`) carries `many: true`; its hints then name the piece. Pages build the typed order themselves and call `set`; whether a hint blocks the download on a page is the page's decision and is stated there (`/tag` blocks, `/holz` and `/papier` do not, so a test engraving or print stays possible).

**Day sheet** (`daySheet.ts`): fixed zones in fixed order (weekday and date, heute wichtig with erster Schritt, morgens/mittags/abends, außerdem, termine, mitnehmen) with limits per zone (`DAY_SHEET_LIMITS`). `parseDaySheet(raw)` validates one day from outside and reports every violation; `layoutDaySheet` sets the sheet and reports entries that are too long (`too-long`, never wrapped) and characters the font lacks (`character`); every line goes through `setRoleLine`, the header through `setSign` (`besideText`, `vertical: 'top'`). `daySheetForm.ts` maps the form of `/tag` to that content and back. All sizes are multiples of Kura's reading size. The zones keep their place on an empty day. Two edges for the whole sheet: weekday, headings, checkboxes and times at the left one, every entry at the second (appointments set their text in a column of their own); the weekday follows the alignment of the text role because it does not stand alone. The page `/tag` feeds a form through the same `parseDaySheet` an agent's content goes through and keeps nothing.

**Registry** (`registry.ts`): `PRODUCTS` lists every product. A new product is one module plus one entry here; it then appears on the overview, the workbench, in the navigation and for agents. It still needs its own page under `src/routes`. Every product must be free of hints in the committed Kura (tested).

**Wood label** (`woodLabel.ts`): formats `series` 64 × 24 mm and `long` 90 × 24 mm; one word, no sub line. `woodLabelSketch` draws a plain top view as SVG (a crop of the larch photo in the tone of the finish); overview and workbench show it only until the larch photo has loaded. `woodLabelSettings(kura, input)` builds the engine's `WoodSettings`; the cap height follows the series format so the long format carries the same type. `woodLabel.set` returns per label layout, settings and hints: the Kura rules for the word from `setSign` on the label's surface with the series cap height (`character`, `sign-width`) plus the fabrication warnings. The case of `WoodSettings.text` comes from `roleText`. Every word of the Kura vocabulary must stay free of hints in the series format (tested).

**Paper label** (`paperLabel.ts`): formats `label` 105 × 74 mm (A4 portrait sheet, 2 × 4) and `sign` 210 × 100 mm (A5 landscape, top); one word per label, sub line allowed. `paperLabel.parse` assigns the places (named ones first, the rest fill the free places in order; a place named twice is a hint), `paperLabel.set` sets every label with `setSign` on its surface (reporting `character`, `sign-width` and `sub-width`) and builds the sheet (`positionAt`/`placeOf` convert between column/row from 1 and the row-wise position from 0); free places stay unprinted. The cell borders are shown in the preview only and are not printed.

## Typesetting (`src/lib/typesetting`)

All lengths in mm, y down. `fonts.ts`: ten free fonts (OFL) in `FONT_CATALOG`, each with three weights; `createFontLoader(fetchFn)` loads and caches; cap height is measured from the glyph H, the thinnest stroke per font and weight from I, H, E, O, n, o, e. `line.ts` sets one line glyph by glyph (kerning, tracking, no ligatures); stacking and aligning lines in a text role is Kura's (`kura/textRole.ts`), typesetting never imports Kura. `geometry.ts` builds and measures paths. Tests load fonts through `testFonts.ts`.

## Medium larch engraving (`src/lib/media/wood`)

Pipeline per change:
1. `layout.ts` sets main and sub line, determines the size and places the text.
2. `checks.ts` returns fabrication warnings: cap height, thinnest stroke, margin to edge/frame/inverse rim, size limit.
3. `surface.ts` rasterises engraving, outline and larch texture and computes albedo, normal and roughness maps (pure array maths plus a canvas adapter). `surfaceView.ts` owns everything around it: cache key, cache, the quick frame (`render.quickPxPerMm`) first and full resolution after `render.refineDelayMs` without further change, the shared larch photo and the diagnostics. `WoodPreview` and `WoodTopView` only present the frames; never repeat this sequence in a component.
4. `scene.ts` (three.js) shows the extruded 4 mm label on the furniture front. Without WebGL, `WoodPreview` shows a flat lit top view (`shadeFlat`).
5. `svgExport.ts` writes the laser file.

The engine supports more than Kura uses today (inverse engraving, frame, pill, oval, automatic size); the workbench can set all of it except the size. Engine tests use `testSettings.ts` (Sora capitals, dark engraving, automatic size) as a fixed base independent of Kura. `layout.ts` still sets and places its lines itself (case via `uppercase`, which the wood label leaves off because `roleText` already applied Kura's case); the wood label takes case, glyph check and word width from `kura/textRole.ts`.

**Calibration**: colours, depths, gloss, light, layout padding and warning thresholds are in `calibration.json` (typed in `calibration.ts`). Adjust there after a test engraving. The front colours (Agave, Anthrazit, Columba Grey) are estimates. The front is the surroundings of the preview, not part of the design.

**SVG contract**: `width`/`height` in mm, `viewBox` 1 unit = 1 mm, text only as paths. Layers by colour: `g#gravur` black fill (engraving; inverse = field minus text, `evenodd`), `g#rahmen` blue `#0000FF` stroke (frame line), `g#schnitt` red `#FF0000` stroke (cut). File name `holzlabel-<text>-<w>x<h>mm.svg`. `buildSheetSvg` puts several labels into one file, one below the other with the gap from `calibration.json` (`laserSheet`); the layers stay the same, one path per label.

**Texture**: `static/textures/laerche-farbe.jpg` and `laerche-spaetholz.jpg` are built from a photo of planed larch boards (source and licence in `nachweis.txt`; the credit is shown on the page). For own photos adjust `CROPS` in the script and `woodTexture` in `calibration.json`.

**Diagnostics**: the preview element carries `data-mode` (`3d`, `fallback`, `loading`, `error`), `data-render-count`, `data-render-quality` (`quick`, `full`) and `data-render-ms`.

## Medium paper print (`src/lib/media/paper`)

`page.ts`: a `PrintPage` is a size in mm and a list of filled or stroked paths; `pageSvg` draws it for the preview. `pdf.ts`: `renderPdf(pages, ink, title)` writes one PDF page per `PrintPage`, true to size in mm (1 mm = 72/25.4 pt, stroke widths in mm). It runs in the browser and in the Worker (verified with `wrangler dev`). Print in one colour, the ink from Kura.

## Orders and MCP server

`products/orders.ts` is what agents see, a thin view of the registry: `listProducts()` returns per product its fields, limits, output format and a valid example; `makeProduct(kura, id, content, font)` returns the file (`OrderFile`) or the hints. Any hint means no file; violations of form and of typesetting come back in one answer. Every example in the list must produce a file (tested).

`server/mcp.ts` exposes two tools over `createMcpHandler` (a fresh server per request, no session): `list_products` and `render_product({ product, content })`. The result is a JSON text with `url`, `fileName`, `mimeType`, `validForHours`, plus a `resource_link`; on a rule violation `created: false` with `hints` (one line each, field path first) and `isError`. The tool contract is tested through `McpDeps` with an in-memory store. The day sheet accepts one day or `{ days: [...] }` with up to seven days. Format ids are the same words in code and for agents (`series`/`long`, `label`/`sign`); the earlier names `standard`, `small` and `large` stay valid as aliases. Wood label and paper label both accept `{ labels: [...] }` for several pieces in one file. The paper label accepts one label (place as `column`/`row` or `position`, from 1) or `{ format, labels: [...] }` for several on one sheet; labels without a place fill the free places in order, a place named twice is a hint.

`server/files.ts` stores a file in Workers KV (binding `FILES`) with a TTL of 24 hours under a 48-digit random hex key; `/d/<key>/<name>` serves it without sign-in.

`server/access.ts` verifies `Cf-Access-Jwt-Assertion` against the team's keys and the application's audience (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`) and holds the access rule in one function, `decideAccess` (tested, including a valid token): `/mcp` answers 503 while Access is unset and 401 without a valid token; `/d/` is open; all other pages require the token once Access is configured; only the dev server (`npm run dev`) is open, because it reads the Access vars from `wrangler.toml` but has no Access in front. `hooks.server.ts` applies the rule and puts the identity into `locals.identity`; the MCP route refuses a second time without it. Change the rule only in `decideAccess`. Never add a switch that opens `/mcp` in production.

Local test of the endpoint: `npm run dev`, then POST JSON-RPC to `/mcp` with `Accept: application/json, text/event-stream`. `wrangler dev` runs the built Worker in the real runtime, where `/mcp` stays closed without Access.

## Web UI

Calm, warm style: off-white (`ivory`, `sand`), dark warm grey (`ink`, `ink-muted`), one terracotta accent (`clay`), lines instead of shadows. Tokens in `src/app.css` (`@theme`), UI fonts `font-ui-head` (Sora) and `font-ui-body` (Noto Sans) from `static/fonts`. Every control is at least 44 px; no horizontal scrolling at 360 px. Product pages share one build: preview, title with one sentence, status card (`StatusCard`: format, hints, download, file name), control groups, secondary actions, footer. A page holds only its input state: the font comes from `useFont` (`typesetting/fontState.svelte.ts`), typesetting and file from the product's `set`, the download from `utils/download.ts`. Use Tailwind utility classes; avoid custom CSS. The UI fonts are independent of Kura's typeface.

## Development Notes

- TypeScript everywhere, strict. Expected errors as `Result<T, E>` (`utils/result.ts`).
- Components use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`).
- German for domain comments, test names and user-facing text; identifiers in English.
- `vite.config.ts` sets `ssr.noExternal: ['opentype.js']`: opentype.js ships ESM only via the `module` field, so it is bundled for SSR.
- Verify UI changes in a browser (dev server plus Playwright), not only with tests.

## Deployment (wrangler.toml)

Worker `kura` on the custom domain `kura.lukasbeyer.com`; `workers_dev` is off. `compatibility_flags = ["nodejs_compat"]` (the MCP SDK imports `node:async_hooks`). KV namespace `kura-files` bound as `FILES`; `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` as vars (not secrets). Two Access applications sit in front: „Kura“ (allow policy, Managed OAuth) and „Kura · Download-Links“ (bypass for `/d/*`). Details in `README.md`, section „Betrieb bei Cloudflare“. Deploying publishes to production; do it only when asked.

## Agent skills

### Issue tracker

Issues live in GitHub Issues of `lukaspbeyer/beyer-labels-v2` (`gh` locally, GitHub MCP tools in cloud sessions). See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
