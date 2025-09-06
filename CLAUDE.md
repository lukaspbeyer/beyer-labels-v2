# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Beyer Labels v2 - A complete SvelteKit migration of the original Hono-based label application. Mobile-optimized web application for creating elegant labels with optional AI-generated pictograms. Built with SvelteKit v2 and deployed on Cloudflare Workers.

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
- **Styling**: Standard Tailwind CSS (Beyer Design only for print views)
- **Build**: Vite + SvelteKit with Cloudflare adapter

### Key Migration Changes from v1
- **Hono JSX** → **Svelte Components**
- **Props Passing** → **Svelte Stores** (reactive state)
- **Custom TypeScript Build** → **Vite + SvelteKit**
- **Manual Routing** → **File-based Routing**
- **Import Maps** → **Native ESM with aliases**

### Project Structure
```
src/
├── routes/                    # SvelteKit file-based routing
│   ├── +page.svelte          # Main application page
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
│   │   └── PrintSetup.svelte        # Print preparation
│   ├── stores/               # Svelte stores for state management
│   │   ├── label.ts          # Label text and pictogram state
│   │   ├── format.ts         # Format selection and positioning
│   │   └── pictogram.ts      # AI pictogram management
│   └── utils/                # Shared utilities and types
│       ├── types.ts          # Unified type definitions
│       ├── labelFormats.ts   # Label format configurations
│       └── imageProcessing.ts # Image trimming utilities

svelte.config.js              # SvelteKit configuration with Cloudflare adapter
wrangler.toml                 # Cloudflare Workers config
```

### Available Label Formats

#### Currently Implemented  
- **105×74mm**: Standard labels (8 per A4 page)
- **210×100mm**: Large signs (A5 landscape, 1 per page)

## Design System

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

**IMPORTANT**: Uses **Svelte Stores** instead of prop passing for better reactivity.

### Store Structure:
```typescript
// Label content and state
label.ts: headline, body, pictogram settings, current label

// Format selection and positioning  
format.ts: selectedFormat, startPosition, available positions

// AI pictogram management
pictogram.ts: generation state, history, error handling
```

### Benefits over Props:
- ✅ Reactive updates across all components
- ✅ No prop drilling through component tree  
- ✅ Centralized state management
- ✅ Better performance with selective subscriptions
- ✅ TypeScript integration

## API Routes (SvelteKit Conventions)

### Server Routes (+server.ts)
- `GET /api/label-formats` - Enhanced format configurations
- `POST /api/generate-pictogram` - OpenAI GPT-Image-1 integration  
- `POST /print` - Server-side HTML generation for printing

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

### Tailwind CSS Architecture
- **Utility-First**: Use standard Tailwind utility classes
- **Minimal Custom CSS**: Avoid custom CSS except for print views
- **Responsive Design**: Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`)
- **Component Classes**: Only minimal @layer components for common patterns

### Print System  
- Server-side HTML generation for consistent printing
- Exact mm measurements for label alignment
- Supports both screen preview and print media queries
- Progressive enhancement (works without JavaScript)

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
- Minimize @layer components - prefer utility classes

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

## Migration Benefits Achieved

### Developer Experience
- ✅ Vite's fast HMR and build times
- ✅ Native TypeScript integration
- ✅ Component-scoped styling
- ✅ File-based routing
- ✅ Better IDE support and debugging

### Performance  
- ✅ Smaller bundle sizes (no Virtual DOM)
- ✅ Automatic code splitting
- ✅ Server-side rendering capabilities
- ✅ Progressive enhancement

### Maintainability
- ✅ Reactive state management with Svelte stores
- ✅ Better separation of concerns
- ✅ Consistent component patterns  
- ✅ TypeScript throughout
- ✅ Future-proof with Svelte 5 compatibility

The SvelteKit v2 migration provides a modern, performant, and maintainable foundation while preserving all original functionality and design principles of the Beyer Labels application.