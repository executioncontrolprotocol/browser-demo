# ECP Browser Demo

Standalone **ECP Graph Editor** demo app (Vite + React): chat-first UX, workflow/code panels, Mermaid graph viewer, first-run provider selection, and Supabase prompt logging.

This repo is separate from the [Execution Control Protocol (ECP)](https://github.com/GuillaumeCleme/executioncontrolprotocol) monorepo. ECP is consumed as npm packages.

## npm dependencies

| Package | Role |
| ------- | ---- |
| [`@executioncontrolprotocol/browser`](https://www.npmjs.com/package/@executioncontrolprotocol/browser) | Browser runtime host, demo environment helpers |
| [`@executioncontrolprotocol/core`](https://www.npmjs.com/package/@executioncontrolprotocol/core) | Fluent API, browser compile (`@executioncontrolprotocol/core/browser`) |
| [`@executioncontrolprotocol/types`](https://www.npmjs.com/package/@executioncontrolprotocol/types) | Protocol types |

Transitive extensions (formats, harness, Chrome AI) come via `@executioncontrolprotocol/browser`.

> **Note:** `@executioncontrolprotocol/*` packages must be published to npm (or linked locally — see below) before `npm install` succeeds.

## Quick start

```sh
npm install
cp .env.example .env   # optional — Supabase prompt logging
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

```sh
npm run build
npm test
npm run typecheck
```

Harness evals (Ollama `gemma3:1b`) run from the [ECP monorepo](https://github.com/GuillaumeCleme/executioncontrolprotocol): `npm run eval:matrix`. The demo app uses the same **chat** multi-shot harness (`HARNESS_TASKS.CHAT`) as the matrix.

## Local ECP development (`npm link`)

When developing ECP and the demo side-by-side, link local built packages instead of pulling from npm.

```sh
# 1. Build ECP packages (link points at dist/)
cd ../executioncontrolprotocol
npm install && npm run build

# 2. Register local packages globally (dependency order)
cd packages/types && npm link
cd ../core && npm link
cd ../policies && npm link
cd ../extensions/format-eql && npm link
cd ../extensions/format-mermaid && npm link
cd ../extensions/format-toon && npm link
cd ../extensions/chrome-ai && npm link
cd ../extensions/openai && npm link
cd ../extensions/claude && npm link
cd ../harnesses/browser-nano && npm link
cd ../../runtimes/browser && npm link

# 3. Consume linked packages in this repo
cd ../../../executioncontrolprotocol-browser-demo
npm link @executioncontrolprotocol/types @executioncontrolprotocol/core @executioncontrolprotocol/policies @executioncontrolprotocol/format-eql \
  @executioncontrolprotocol/format-mermaid @executioncontrolprotocol/format-toon @executioncontrolprotocol/chrome-ai @executioncontrolprotocol/extension-openai \
  @executioncontrolprotocol/claude @executioncontrolprotocol/harnesses-browser-nano @executioncontrolprotocol/browser
npm run dev

# 4. Restore registry versions when done
npm unlink @executioncontrolprotocol/types @executioncontrolprotocol/core @executioncontrolprotocol/policies @executioncontrolprotocol/format-eql \
  @executioncontrolprotocol/format-mermaid @executioncontrolprotocol/format-toon @executioncontrolprotocol/chrome-ai @executioncontrolprotocol/extension-openai \
  @executioncontrolprotocol/claude @executioncontrolprotocol/harnesses-browser-nano @executioncontrolprotocol/browser
npm install
```

**Tips:**
- Re-run `npm run build` in ECP after changing package source (link serves built `dist/`, not live TS).
- Link all packages `@executioncontrolprotocol/browser` depends on — not just the three direct imports.
- Optional: use `"file:../executioncontrolprotocol/packages/..."` overrides in `package.json` instead of `npm link`.

## Supabase prompt logging

User chat prompts are logged to `ecp_browser_demo_prompts`. See [`supabase/README.md`](supabase/README.md).

```sh
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run supabase:push
```

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Deploy (GitHub Pages)

Live demo: `https://guillaumecleme.github.io/executioncontrolprotocol-browser-demo/`

Deploys on push to **`main`** via [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

**Setup:** repo **Settings → Pages → Source: GitHub Actions**.

**Secrets for Supabase logging in production builds:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Local Pages build:

```sh
GITHUB_PAGES=true GITHUB_REPOSITORY=GuillaumeCleme/executioncontrolprotocol-browser-demo npm run build:pages
```

## Spec

- [`docs/ecp-browser-demo.md`](docs/ecp-browser-demo.md) — phased plan and milestones
- [`docs/browser-demo-extensions-and-prompts.md`](docs/browser-demo-extensions-and-prompts.md) — extensions and harness wiring

## Related repos

- **ECP protocol:** https://github.com/GuillaumeCleme/executioncontrolprotocol
- **This demo:** https://github.com/GuillaumeCleme/executioncontrolprotocol-browser-demo
