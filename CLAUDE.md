# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Beyer Labels - Mobile-optimized web application for creating elegant labels with optional AI-generated pictograms. Built with SvelteKit v2 and deployed on Cloudflare Workers.

Two areas:
- **Papier** (`/`): printed paper labels.
- **Holz** (`/holz`): door labels made of larch (Lärche), engraved with a CO₂ laser (xTool X1). Photorealistic 3D preview on a furniture front, Japandi presets and SVG export for the laser software.

## Commands

```bash
# Development
npm run dev           # Start Vite dev server with SvelteKit
npm run build         # Build for production with Cloudflare adapter
npm run preview       # Preview production build locally

# Deployment  
wrangler deploy       # Deploy to Cloudflare Workers

# Type checking
npm run check         # Run svelte-check with TypeScript
npm run check:watch   # Run svelte-check in watch mode

# Tests
npm run test:run      # Vitest (jsdom)

# Larch texture for /holz (Python with Pillow and NumPy)
python3 scripts/build-larch-texture.py <photo>   # writes static/textures/laerche-*.jpg

# Setup
npm install                          # Install dependencies
wrangler secret put OPENAI_API_KEY  # Set OpenAI API key for pictogram generation
```

## Architecture

### Tech Stack
- **Runtime**: Cloudflare Workers (Edge)
- **Framework**: SvelteKit v2 with TypeScript
- **State Management**: Svelte Stores (reactive)
- **Components**: Svelte Components with Tailwind CSS
- **AI Integration**: OpenAI GPT-Image-1 for pictogram generation (transparent backgrounds)
- **3D preview (/holz)**: three.js, loaded dynamically in the browser on `/holz` only
- **Fonts as paths (/holz)**: opentype.js parses the local font files for layout and SVG export
- **Styling**: Standard Tailwind CSS (Beyer Design only for print views)
- **Build**: Vite + SvelteKit with Cloudflare adapter

### Project Structure
```
src/
├── routes/                    # SvelteKit file-based routing
│   ├── +page.svelte          # Main application page (Papier)
│   ├── holz/
│   │   ├── +page.svelte      # Wood label configurator (Holz)
│   │   └── holz.css          # @font-face rules for the local fonts
│   ├── api/                  # Server-side API routes  
│   │   ├── label-formats/
│   │   │   └── +server.ts    # Label format configurations API
│   │   └── generate-pictogram/
│   │       └── +server.ts    # OpenAI pictogram generation API
│   └── print/
│       └── +server.ts        # Server-side print layout generation
├── lib/
│   ├── components/           # Svelte components
│   │   ├── FormatSelector.svelte    # Format selection buttons
│   │   ├── LabelForm.svelte         # Text input fields
│   │   ├── GridSelector.svelte      # Position selector grid  
│   │   ├── PictogramEditor.svelte   # AI pictogram generation
│   │   ├── PrintSetup.svelte        # Print preparation
│   │   └── wood/                    # /holz: PresetPicker, WoodControls, WoodPreview, ControlGroup, Segmented, Slider
│   ├── stores/               # Svelte stores for state management
│   │   ├── label.ts          # Label text and pictogram state (single label)
│   │   ├── format.ts         # Format selection and label positioning
│   │   ├── pictogram.ts      # AI pictogram management
│   │   └── wood.ts           # /holz settings (single label)
│   ├── types/opentype.d.ts   # Types for the used part of opentype.js
│   └── utils/                # Shared utilities and types
│       ├── types.ts          # Unified type definitions
│       ├── result.ts         # Result<T, E> for expected errors
│       ├── labelFormats.ts   # Label format configurations
│       ├── imageProcessing.ts # Image trimming utilities
│       └── wood/             # /holz logic (see "Holzlabels")
static/fonts/<font>/          # Local WOFF files (latin, three weights per font) + OFL.txt
static/textures/              # Larch texture, latewood map, nachweis.txt (CC BY 2.0)
scripts/build-larch-texture.py # Builds the larch texture from a photo

svelte.config.js              # SvelteKit configuration with Cloudflare adapter
wrangler.toml                 # Cloudflare Workers config
```

### Available Label Formats (Papier)

- **105×74mm**: Standard labels (8 per A4 page)
- **210×100mm**: Large signs (A5 landscape, 1 per page)

## Design System

### Web UI /holz
Calm, warm style: off-white (`ivory`, `sand`), dark warm grey (`ink`, `ink-muted`), one terracotta accent (`clay`), lines instead of shadows. Tokens in `src/app.css` (`@theme`), UI fonts `font-ui-head` (Sora) and `font-ui-body` (Noto Sans) from `static/fonts`. Every control is at least 44 px; no horizontal scrolling at 360 px.

### Web UI (Standard Tailwind CSS)
Uses **standard Tailwind CSS** for the web interface:
- **Utility-First**: Standard Tailwind utility classes
- **Default Design**: Clean, modern web UI using Tailwind's default design system
- **Responsive**: Standard Tailwind responsive patterns
- **Components**: Minimal custom components, primarily utility classes

### Print Views (Beyer Design Guidelines) 
**IMPORTANT**: Print views maintain the original Beyer Design Guidelines:
- **Fonts**: Sora (400) for headlines, Noto Sans (400) for body text
- **Typography**: Letter-spacing (0.05em), text-transform uppercase, precise line-heights
- **Colors**: #3E342E (main text), #7D6B5D (sub text)
- **Layout**: Exact mm measurements for precise label alignment
- **Implementation**: Inline CSS in `/print/+server.ts` for print precision

## State Management Architecture

### Single-Label Architecture
**IMPORTANT**: The app is designed for **single-label printing only**. There is no multi-label support.

### Store Structure:
```typescript
// Label content and state
label.ts: headline, body, pictogram settings, currentLabel (single label)

// Format selection and positioning  
format.ts: selectedFormat, labelPosition (position of single label on grid)

// AI pictogram management
pictogram.ts: generation state, error handling
```

### Benefits of Svelte Stores:
- ✅ Reactive updates across all components
- ✅ No prop drilling through component tree  
- ✅ Centralized state management
- ✅ Better performance with selective subscriptions
- ✅ TypeScript integration

## Holzlabels (/holz)

Pipeline per change (all lengths in mm, y down):
1. `stores/wood.ts` holds `WoodSettings` (start: preset Tatami, `applyPreset`); the page loads the font (`utils/wood/fonts.ts`, `createFontLoader`) and keeps layout and settings as a pair once the selected font is loaded.
2. `layout.ts` sets main and sub line glyph by glyph (kerning, tracking, no ligatures), determines the size (auto: text + padding, whole mm, 20–200 × 10–100) and places the text. `geometry.ts` builds the shapes (rectangle with corner radius, pill, oval).
3. `checks.ts` returns fabrication warnings: cap height, thinnest stroke (measured per font and weight from I, H, E, O, n, o, e), margin to edge/frame/inverse rim, size limit.
4. `surface.ts` rasterises engraving, outline and larch texture and computes albedo, normal and roughness maps (depth, wall taper, self shadow, latewood shallower and lighter, halo, charred edge, finish). After a change a quick frame (`render.quickPxPerMm`) appears first, full resolution follows after `render.refineDelayMs` without further change.
5. `scene.ts` (three.js) shows the extruded 4 mm label on the furniture front (no handle). Without WebGL, `WoodPreview` shows a flat lit top view (`shadeFlat`).
6. `svgExport.ts` writes the laser file.

**Fonts**: ten free fonts (OFL) in `FONT_CATALOG`, each with its own three weights (Zen Kaku/Maru Gothic: 400/500/700, others 400/500/600); `nearestWeight` adjusts the weight on a font change. Cap height is measured from the glyph H. Shippori Mincho has fine hairlines and needs about 7 mm cap height.

**Presets** (`utils/wood/presets.ts`): Japandi presets for the fronts in the house (Agave, Anthrazit, Columba Grey): Tatami, Sumi, Washi, Hinoki, Mincho, Ishi. A preset sets design and front only; text, size, grain, view and light stay. Every preset must stay free of fabrication warnings (tested).

**Calibration**: all colours, depths, gloss, light, layout padding and warning thresholds are in `utils/wood/calibration.json` (typed in `calibration.ts`). Adjust there after a test engraving. The front colours (Agave, Anthrazit, Columba Grey) are estimates; match them to a sample.

**SVG contract**: `width`/`height` in mm, `viewBox` 1 unit = 1 mm, text only as paths. Layers by colour: `g#gravur` black fill (engraving; inverse = field minus text, `evenodd`), `g#rahmen` blue `#0000FF` stroke (frame line), `g#schnitt` red `#FF0000` stroke (cut). File name `holzlabel-<text>-<w>x<h>mm.svg`.

**Texture**: `static/textures/laerche-farbe.jpg` and `laerche-spaetholz.jpg` are built from a photo of planed larch boards (source and licence in `nachweis.txt`; the credit is shown on the page). Six lamellae stacked as a panel; the label sits inside one lamella when it fits across the grain. For own photos adjust `CROPS` in the script and `woodTexture` in `calibration.json`.

**Diagnostics**: the preview element carries `data-mode` (`3d`, `fallback`, `loading`, `error`), `data-render-count`, `data-render-quality` (`quick`, `full`) and `data-render-ms`.

## API Routes (SvelteKit Conventions)

### Server Routes (+server.ts)
- `GET /api/label-formats` - Format configurations
- `POST /api/generate-pictogram` - OpenAI GPT-Image-1 integration  
- `POST /print` - Server-side HTML generation for printing single label

### Environment Variables
```bash
# Development (.env)
OPENAI_API_KEY=sk-your-key-here

# Production (Wrangler)
wrangler secret put OPENAI_API_KEY
```

## Development Notes

### Component Architecture
- **Reactive Statements**: Use `$:` for computed values
- **Store Subscriptions**: Use `$storeName` for reactive values
- **Styling**: Standard Tailwind utility classes for web UI
- **TypeScript**: Strict typing throughout

### Print System  
- Server-side HTML generation for consistent printing
- Single label positioned on grid based on user selection
- Exact mm measurements for label alignment
- Supports both screen preview and print media queries

### Build Process
1. **SvelteKit** compiles components and routes
2. **Vite** handles bundling and optimization  
3. **Cloudflare Adapter** generates Workers-compatible output
4. **Wrangler** deploys to Cloudflare Workers

### Best Practices
- Always use Svelte stores for state management
- Keep components focused and reactive
- Use TypeScript for all files
- **Web UI**: Use standard Tailwind utility classes, avoid custom CSS
- **Print Views**: Use inline CSS in `/print/+server.ts` for Beyer Design precision  
- Follow SvelteKit conventions for routing and API

## Important Configurations

### SvelteKit Configuration (svelte.config.js)
```javascript
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    }),
    alias: {
      $components: './src/lib/components',
      $stores: './src/lib/stores', 
      $utils: './src/lib/utils',
      $server: './src/lib/server'
    }
  }
};
```

### Vite Configuration (vite.config.ts)
`ssr.noExternal: ['opentype.js']`: opentype.js ships ESM only via the `module` field, so it is bundled for SSR instead of being loaded as CommonJS.

### Wrangler Configuration (wrangler.toml)
```toml
name = "beyer-labels-v2"
main = ".svelte-kit/cloudflare/_worker.js"
compatibility_date = "2025-01-01"

[assets]
directory = ".svelte-kit/cloudflare"
binding = "ASSETS"

[vars]
ENVIRONMENT = "production"
```