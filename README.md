# ECP Browser Demo

Standalone **ECP Graph Editor** demo app (Vite + React): chat-first UX, workflow/code panels, Mermaid graph viewer, first-run provider selection, and Supabase prompt logging.

This repo is separate from the [Execution Control Protocol (ECP)](https://github.com/executioncontrolprotocol/executioncontrolprotocol) monorepo. ECP is consumed as npm packages (or linked locally during protocol development).

## Architecture (app owns composition)

| Layer | Package | Role here |
| ----- | ------- | --------- |
| Compile | `@executioncontrolprotocol/core/browser` | Fluent/TS compile in the page |
| Runtime host | `@executioncontrolprotocol/browser` | Executor, registry, session — **no harnesses** |
| This app | `createDemoAppEnvironment` | Binds formats, Chrome AI / Ollama / …, **nano + coding harnesses** |

Provider and harness are independent switches (`resolveDemoSession`). Today, choosing **Ollama** also selects the **Fluent/TS coding** harness; Chrome AI uses the nano (EQL) harness.

Ollama settings use the local **`ecp up`** daemon (default `http://127.0.0.1:3090`). Prefer `ecp up`, which opens this demo with `?token=` (and `?bridge=`) so pairing is automatic. The Ollama provider enables when `/health` reports `ollamaReachable`. Hosted HTTPS pages need **Chromium** (Private Network Access); local Vite works in any browser.

### Browser vendor extensions

Prefer the real SDK whenever it can run in the browser:

| Extension | Browser runtime | Notes |
| --------- | --------------- | ----- |
| `@executioncontrolprotocol/fal` | **Yes** — official `@fal-ai/client` | Configure `apiKey` via `browser("FAL_KEY")` (vault / secrets). Vite prebundles the CJS client (`optimizeDeps.include`). |
| `@executioncontrolprotocol/image-sharp` | **Catalog + host hop** | Package `exports["."].browser` is catalog-only (no native `sharp`). Dispatch hops to `ecp up --env …`. |

Do not stub browser-capable HTTP clients. Native addons belong on the package `browser` export, not a Vite alias.

See monorepo [AGENTS.md](https://github.com/executioncontrolprotocol/executioncontrolprotocol/blob/main/AGENTS.md) for compile vs runtime vs app boundaries.

## Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| **Node.js >= 22** | Enforced in `package.json` `engines` |
| **Chrome** (recommended) | Default provider uses Chrome built-in AI (`@executioncontrolprotocol/chrome-ai`) |
| **Ollama** (optional) | Local models via `ecp up` — option enabled when daemon `/health` reports `ollamaReachable` |
| **ECP CLI `ecp up`** (for Ollama) | Loopback daemon on port 3090; paste pairing token in the demo |
| **ECP monorepo clone** (local dev only) | Sibling checkout — see [Repository layout](#repository-layout) |

Optional: [Ollama](https://ollama.com/) with `gemma3:1b` / `qwen2.5-coder:1.5b` for harness evals in the ECP repo (`npm run eval:matrix` / `eval:matrix:coding`).

## Repository layout

For side-by-side development, clone both repos under the same parent directory:

```text
your-workspace/
  executioncontrolprotocol/   # ECP monorepo (protocol + packages)
  browser-demo/               # this app (GitHub: executioncontrolprotocol/browser-demo)
```

Paths below assume `browser-demo` is a sibling of `executioncontrolprotocol`. Adjust if your folder names differ.

## npm dependencies

| Package | Role |
| ------- | ---- |
| [`@executioncontrolprotocol/browser`](https://www.npmjs.com/package/@executioncontrolprotocol/browser) | Browser runtime host |
| [`@executioncontrolprotocol/core`](https://www.npmjs.com/package/@executioncontrolprotocol/core) | Fluent API, browser compile (`@executioncontrolprotocol/core/browser`) |
| [`@executioncontrolprotocol/types`](https://www.npmjs.com/package/@executioncontrolprotocol/types) | Protocol types |
| `@executioncontrolprotocol/harnesses-browser-nano` | EQL harness (Chrome AI path) |
| `@executioncontrolprotocol/harnesses-browser-coding` | Fluent/TS harness (Ollama path) |
| Providers / formats | Chrome AI, Ollama, OpenAI, Claude, fal, TOON, Mermaid, EQL — **direct** app deps |

> **Note:** `@executioncontrolprotocol/*` packages must be published to npm (or linked locally — see below) before `npm install` succeeds.

## Quick start (published npm)

Use this when you are **not** changing ECP package source.

```sh
npm install
cp .env.example .env   # optional — Supabase prompt logging
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

```sh
npm run build
npm test
npm run lint
```

(`npm run lint` runs `typecheck`; Husky pre-commit runs secretlint then lint.)

Harness evals (Ollama `gemma3:1b`) run from the [ECP monorepo](https://github.com/executioncontrolprotocol/executioncontrolprotocol): `npm run eval:matrix`. The demo app uses the same **chat** multi-shot harness (`HARNESS_TASKS.CHAT`) as the matrix.

## Rebuild workspace from scratch (after large ECP changes)

Use this workflow when you have pulled or built **large feature changes** in the ECP monorepo and the demo shows stale behavior, type errors, or missing exports. `npm link` serves built `dist/` output — a full rebuild is required after substantive protocol changes.

### 1. Stop duplicate Vite dev servers

Only one dev server should listen on port 5173. If you started `npm run dev` in multiple terminals, stop extras first.

**Windows (PowerShell):**

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match 'vite\\bin\\vite' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

**macOS / Linux:**

```sh
pkill -f 'vite/bin/vite' || true
```

Or press `Ctrl+C` in each terminal running `npm run dev`.

### 2. Clean and rebuild the ECP monorepo

```sh
cd ../executioncontrolprotocol

npm run clean          # removes packages/*/dist and tsconfig.tsbuildinfo
npm install            # from repo root only — never inside individual packages
npm run build          # tsc -b (types → core → extensions → browser → …)
npm run generate:schema
```

**Windows (PowerShell)** — use `;` instead of `&&` when chaining:

```powershell
Set-Location ..\executioncontrolprotocol
npm run clean; npm install; npm run build; npm run generate:schema
Set-Location ..\browser-demo
npm run dev
```

**Verify `dist/` exists** before starting the demo (linked packages point at source trees, not prebuilt npm tarballs):

```powershell
# should print True
Test-Path ..\executioncontrolprotocol\packages\runtimes\browser\dist\index.js
```

If that prints `False` after `npm run build`, force a full emit:

```sh
cd ../executioncontrolprotocol
npx tsc -b tsconfig.build.json --force
npm run generate:schema
```

Optional but recommended after large changes:

```sh
npm run check          # build + schema + lint + unit + integration + e2e
```

For a **hard reset** when installs are corrupted:

```sh
# Windows PowerShell
Remove-Item -Recurse -Force node_modules
# macOS / Linux: rm -rf node_modules

npm install
npm run build
npm run generate:schema
```

### 3. Link local ECP packages into this app

Skip this section if you use published npm versions only. After every ECP rebuild, linked packages pick up new `dist/` automatically — you do **not** need to re-run `npm link`, only `npm run build` in ECP.

<details>
<summary>First-time <code>npm link</code> setup (expand)</summary>

Register packages globally in **dependency order** (link points at each package's `dist/`):

```sh
cd ../executioncontrolprotocol

cd packages/types && npm link
cd ../core && npm link
cd ../policies && npm link
cd ../extensions/format-eql && npm link
cd ../extensions/format-mermaid && npm link
cd ../extensions/format-reactflow && npm link
cd ../extensions/format-toon && npm link
cd ../extensions/chrome-ai && npm link
cd ../extensions/openai && npm link
cd ../extensions/claude && npm link
cd ../extensions/browser-secrets && npm link
cd ../harnesses/browser-nano && npm link
cd ../../runtimes/browser && npm link
```

Consume linked packages in the demo:

```sh
cd ../../browser-demo

npm link @executioncontrolprotocol/types @executioncontrolprotocol/core @executioncontrolprotocol/policies \
  @executioncontrolprotocol/format-eql @executioncontrolprotocol/format-mermaid @executioncontrolprotocol/format-reactflow \
  @executioncontrolprotocol/format-toon \
  @executioncontrolprotocol/chrome-ai @executioncontrolprotocol/extension-openai @executioncontrolprotocol/claude \
  @executioncontrolprotocol/browser-secrets @executioncontrolprotocol/harnesses-browser-nano \
  @executioncontrolprotocol/browser
```

</details>

### 4. Refresh the browser demo and start dev

```sh
cd ../browser-demo

# optional hard reset of demo install
# Remove-Item -Recurse -Force node_modules   # Windows
# rm -rf node_modules                        # macOS / Linux

npm install
npm run dev
```

Open `http://localhost:5173`. If the page still looks stale, hard-refresh the browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) or clear site data for localhost.

### 5. Verify (optional)

```sh
# in browser-demo
npm run typecheck
npm test

# in executioncontrolprotocol (with Ollama running)
npm run eval:matrix
```

### Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `Failed to resolve entry for package "@executioncontrolprotocol/browser"` | ECP `dist/` is missing — `npm link` junction points at the package folder but Vite needs `dist/index.js`. Run `npm run clean && npm run build` in ECP (or `npx tsc -b tsconfig.build.json --force`). Verify with `Test-Path ...\browser\dist\index.js`. |
| Port 5173 already in use | Kill extra Vite processes (step 1); Vite may fall back to 5174+ if 5173 is taken |
| `is not a function` / missing export at runtime | ECP `dist/` is stale — rerun `npm run build` in `executioncontrolprotocol` |
| Type errors in demo after ECP API change | Rebuild ECP, then `npm run typecheck` here; update demo imports if the API moved |
| Linked package still shows old behavior | Confirm link targets built `dist/` (`npm run build` in ECP); restart `npm run dev` |
| `npm install` fails on `@executioncontrolprotocol/*` | Publish packages or complete `npm link` setup above |
| `Harness prompt fixture not found: intent-classification` | Ensure `@executioncontrolprotocol/harnesses-browser-*` is `>=0.10.1` (0.10.0 had a bad `import.meta.glob` path). Reinstall from the lockfile; do not use stale `file:` links to unbuilt packages. |

**Alternative to `npm link` (local only — do not commit):** temporarily override ranges with `"file:../executioncontrolprotocol/packages/..."` in `package.json`, or use `npm install ../executioncontrolprotocol/packages/<pkg>`. Restore caret ranges before push so GitHub Actions / Pages can resolve from the npm registry.

## Local ECP development (`npm link`) — summary

When developing ECP and the demo side-by-side, link local built packages instead of pulling from npm. See [Rebuild workspace from scratch](#rebuild-workspace-from-scratch-after-large-ecp-changes) for the full procedure.

**Tips:**

- Re-run `npm run build` (and `npm run generate:schema` when types change) in ECP after every package source change.
- Link all packages `@executioncontrolprotocol/browser` depends on — not just the three direct demo imports.
- Restore registry versions when finished:

```sh
npm unlink @executioncontrolprotocol/types @executioncontrolprotocol/core @executioncontrolprotocol/policies \
  @executioncontrolprotocol/format-eql @executioncontrolprotocol/format-mermaid @executioncontrolprotocol/format-toon \
  @executioncontrolprotocol/chrome-ai @executioncontrolprotocol/extension-openai @executioncontrolprotocol/claude \
  @executioncontrolprotocol/browser-secrets @executioncontrolprotocol/harnesses-browser-nano \
  @executioncontrolprotocol/browser
npm install
```

## Supabase prompt logging

User chat prompts are logged to `ecp_browser_demo_prompts`. See [`supabase/README.md`](supabase/README.md).

```sh
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run supabase:push
```

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Deploy (GitHub Pages)

Live demo: `https://executioncontrolprotocol.github.io/browser-demo/`

Deploys on push to **`main`** via [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

**Setup:** repo **Settings → Pages → Source: GitHub Actions**.

**Secrets for Supabase logging in production builds:**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Local Pages build:

```sh
GITHUB_PAGES=true GITHUB_REPOSITORY=executioncontrolprotocol/browser-demo npm run build:pages
```

Requires `@executioncontrolprotocol/*@^0.10.1` so browser `core/compile` exports `compileHarnessArtifactSource` (used by the coding harness).

## Spec

- [`docs/ecp-browser-demo.md`](docs/ecp-browser-demo.md) — phased plan and milestones
- [`docs/browser-demo-extensions-and-prompts.md`](docs/browser-demo-extensions-and-prompts.md) — extensions and harness wiring
- [`docs/todos.md`](docs/todos.md) — follow-ups / resolved workarounds

## Related repos

- **ECP protocol:** https://github.com/executioncontrolprotocol/executioncontrolprotocol
- **This demo:** https://github.com/executioncontrolprotocol/browser-demo
