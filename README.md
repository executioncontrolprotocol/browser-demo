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
| `@executioncontrolprotocol/image-sharp` | **Catalog + host hop** | Bound in the demo env (browser catalog only; no native `sharp`). Steps hop to `ecp up --env …` that binds Sharp on the host. Bare `ecp up` (Ollama-only) is not enough. |

Local unpublished dogfood: `pnpm run link:vendor` (junction-links `fal` and `image-sharp` from the extensions repo). Never commit `file:` deps. They stay optional peers so registry `pnpm install` stays clean. Host example for Sharp: [extensions/examples/04-image-prep](https://github.com/executioncontrolprotocol/extensions/tree/main/examples/04-image-prep) — `ecp up --env environment.ts --open-url http://localhost:5173/`.

Do not stub browser-capable HTTP clients. Native addons belong on the package `browser` export, not a Vite alias.

See monorepo [AGENTS.md](https://github.com/executioncontrolprotocol/executioncontrolprotocol/blob/main/AGENTS.md) for compile vs runtime vs app boundaries.

## Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| **Node.js >= 22** | Enforced in `package.json` `engines` |
| **pnpm** | `packageManager` is pinned in `package.json` |
| **Chrome** (recommended) | Default provider uses Chrome built-in AI (`@executioncontrolprotocol/chrome-ai`) |
| **Ollama** (optional) | Local models via `ecp up` — option enabled when daemon `/health` reports `ollamaReachable` |
| **ECP CLI `ecp up`** (for Ollama) | Loopback daemon on port 3090; paste pairing token in the demo |
| **ECP monorepo clone** (local dev only) | Sibling checkout — see [Repository layout](#repository-layout) |

Optional: [Ollama](https://ollama.com/) with `gemma3:1b` / `qwen2.5-coder:1.5b` for harness evals in the ECP repo (`pnpm run eval:matrix` / `eval:matrix:coding`).

## Repository layout

For side-by-side development, clone repos under the same parent directory:

```text
your-workspace/
  executioncontrolprotocol/   # ECP monorepo (protocol + packages)
  extensions/                 # vendor extensions (optional; for fal / image-sharp)
  browser-demo/               # this app
```

Paths below assume `browser-demo` is a sibling of `executioncontrolprotocol`. Adjust if your folder names differ.

## Quick start (published npm)

Use this when you are **not** changing ECP package source.

```sh
pnpm install
cp .env.example .env   # optional — Supabase prompt logging
pnpm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

```sh
pnpm run build
pnpm test
pnpm run lint
```

(`pnpm run lint` runs `typecheck`; Husky pre-commit runs secretlint, then lint.)

Harness evals (Ollama `gemma3:1b`) run from the [ECP monorepo](https://github.com/executioncontrolprotocol/executioncontrolprotocol): `pnpm run eval:matrix`. The demo app uses the same **chat** multi-shot harness (`HARNESS_TASKS.CHAT`) as the matrix.

## Local ECP development

When developing ECP and the demo side-by-side, junction-link local built packages instead of pulling from npm.

**One command** (rebuild core, link packages, vendor extensions, host example, restart Vite + `ecp up`):

```sh
pnpm run dev:linked
```

Opens **ECP up** and **Vite** in separate terminal windows (Windows/macOS) so the pairing token and demo URL stay visible. On Linux, logs go to `.dev-logs/`.

After small ECP edits, skip the monorepo rebuild:

```sh
pnpm run dev:linked -- --skip-build
```

Granular steps:

```sh
# 1. Build sibling core (from ../executioncontrolprotocol)
pnpm install && pnpm run build

# 2. Link ECP packages into this app
pnpm run link:ecp

# 3. Optional: link vendor extensions (fal, image-sharp)
pnpm run link:vendor

# 4. Optional: link host example for image-sharp E2E
pnpm run link:host

# 5. Start dev server
pnpm run dev
```

Environment overrides: `ECP_ROOT`, `EXTENSIONS_ROOT`, `HOST_EXAMPLE_ROOT`, `ECP_HOST_PORT`, `VITE_PORT`.

**Never use `file:` package links** in `package.json` (CI and Pages resolve from the npm registry only). `pnpm run check:no-file-deps` enforces this on pre-commit and in CI.

**Tips:**

- Re-run `pnpm run build` (and `pnpm run generate:schema` when types change) in ECP after every package source change.
- Linked packages point at built `dist/` — rebuild core after substantive protocol changes, then restart `pnpm run dev`.
- Restore registry versions when finished: delete junctions under `node_modules/@executioncontrolprotocol/` and run `pnpm install`.

| Symptom | Fix |
| ------- | --- |
| `Failed to resolve entry for package "@executioncontrolprotocol/browser"` | ECP `dist/` is missing — run `pnpm run build` in the core monorepo |
| Port 5173 already in use | Stop extra Vite processes; Vite may fall back to 5174+ |
| `is not a function` / missing export at runtime | ECP `dist/` is stale — rebuild core, restart dev |
| Type errors after ECP API change | Rebuild core, then `pnpm run typecheck` here |
| `pnpm install` fails on `@executioncontrolprotocol/*` | Publish packages or run `pnpm run link:ecp` |

## Supabase prompt logging

User chat prompts are logged to `ecp_browser_demo_prompts`. See [`supabase/README.md`](supabase/README.md).

```sh
npx supabase login
npx supabase link --project-ref <your-project-ref>
pnpm run supabase:push
```

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## CI (two-track)

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on push and pull request to **`main`** and **`development`**.

- **`main`:** `pnpm install --frozen-lockfile` against **published** `@executioncontrolprotocol/*` from npm. Jobs: secrets scan, typecheck, test, build.
- **`development` (and PRs not targeting `main`):** CI checks out sibling [core](https://github.com/executioncontrolprotocol/executioncontrolprotocol) and [extensions](https://github.com/executioncontrolprotocol/extensions) at `development`, runs `pnpm run ci:setup` (build + link), then typecheck / test / build.

It does not deploy.

## Deploy (GitHub Pages)

Live demo: `https://demo.executioncontrolprotocol.io/`

Deploys on push to **`main`** via [`.github/workflows/pages.yml`](.github/workflows/pages.yml). `development` is verify-only (see CI above). Assets are built with Vite `base: "/"` for the custom domain (domain root, not `/browser-demo/`).

**Setup:** repo **Settings → Pages → Source: GitHub Actions**, custom domain `demo.executioncontrolprotocol.io`.

**Secrets for Supabase logging in production builds:**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Local production build (same as Pages):

```sh
pnpm run build:pages
```

For a subdirectory deploy, set `VITE_BASE=/your-subpath/` before building.

Requires `@executioncontrolprotocol/*@^0.13.2` from npm (or `pnpm run link:ecp` to a local build) so browser `core/compile` exports `compileHarnessArtifactSource` (used by the coding harness).

## Spec

- [`docs/ecp-browser-demo.md`](docs/ecp-browser-demo.md) — phased plan and milestones
- [`docs/browser-demo-extensions-and-prompts.md`](docs/browser-demo-extensions-and-prompts.md) — extensions and harness wiring
- [`docs/todos.md`](docs/todos.md) — follow-ups / resolved workarounds

## Related repos

- **ECP protocol:** https://github.com/executioncontrolprotocol/executioncontrolprotocol
- **This demo:** https://github.com/executioncontrolprotocol/browser-demo
