# Browser demo: extensions, capabilities, prompts, and intent routing

This report describes what exists in the **ECP browser demo** today: which extensions are registered, how capabilities are invoked, what system and user prompts are passed to each model path, and how chat intent is filtered before authoring runs. Use it to reason about next steps—especially **intent classification** for workflow authoring vs general Q&A on Chrome Gemini Nano and other providers.

**Scope:** this repo (`executioncontrolprotocol-browser-demo`), [`@executioncontrolprotocol/browser`](https://github.com/GuillaumeCleme/executioncontrolprotocol/tree/main/packages/runtimes/browser), and extensions bound by `createBrowserDemoEnvironment()` / `createDemoAppEnvironment()`. Other ECP extensions (Ollama, Slack, storage, etc.) exist in the protocol repo but are **not** wired into the browser demo environment unless noted.

---

## 1. Architecture at a glance

The demo app is not “a model with a UI.” It is an **ECP environment** (`browser-demo-app`) with bound extensions, plus a thin React shell that:

1. Calls **`ecp.describe()`** to learn bound extensions and capabilities.
2. Routes chat through either **guided help** or **workflow authoring** (model-generated TOON).
3. Uses the **canonical workflow manifest** (JSON-shaped `@executioncontrolprotocol.workflow`) as the hub for Fluent, TOON, and Mermaid panels.
4. Runs workflows via **`ecp.run(manifest)`**, which invokes step capabilities (e.g. `@executioncontrolprotocol/chrome-ai.generate`).

```mermaid
flowchart TB
  subgraph ui [Browser demo UI]
    Chat[ChatPanel]
    Authoring[BrowserAuthoringService]
    Guide[guideChat OR looksLikeWorkflowRequest]
    Panels[encodePanels: Fluent / TOON / Mermaid / JSON]
    Run[ecp.run]
  end

  subgraph ecp [ECP runtime]
    Describe[ecp.describe]
    Invoke[ecp.invoke capability]
    Decode[ecp.decode TOON]
    Patch[ecp.patch]
    Validate[ecp.validate]
  end

  Chat --> Guide
  Guide -->|guided FAQ| GuideCap["@executioncontrolprotocol/browser.guideChat"]
  Guide -->|workflow intent| Authoring
  Authoring --> Invoke
  Invoke --> Decode --> Validate --> Panels
  Panels --> Run
  Run --> Gen["@executioncontrolprotocol/chrome-ai.generate"]
```

**Key separation:**

| Concern | Mechanism | Output |
| -------- | ----------- | -------- |
| “Explain ECP / UI” | `@executioncontrolprotocol/browser.guideChat` or Nano with future general prompt | Prose in chat |
| “Create / change workflow” | `BrowserAuthoringService` → `*.generate` | TOON → manifest → panels |
| “Run workflow” | `ecp.run` | Step capability results (JSON in Run panel) |
| “Show graph / code” | `encodePanels` from manifest | Independent encoders (no TOON→Mermaid pipeline) |

---

## 2. Environment: what is bound for the demo

### 2.1 Registration (`registerBrowserDefaults`)

All of the following are registered on the global extension catalog when the browser package loads defaults:

| Extension ID | Package | Role in demo |
| ------------ | ------- | ------------ |
| `@executioncontrolprotocol/browser` (runtime) | `packages/runtimes/browser` | Browser execution runtime |
| `@executioncontrolprotocol/browser-registry` | `packages/runtimes/browser` | Registry freeze, `globalThis.ecp`, auto-bind |
| `@executioncontrolprotocol/browser-session-config` | `packages/runtimes/browser` | In-memory session keys (API keys); cleared on `terminate()` |
| `@executioncontrolprotocol/browser-local-config` | `packages/runtimes/browser` | Optional localStorage config (denylist for secrets) |
| `@executioncontrolprotocol/browser` | `packages/runtimes/browser` | **`guideChat`** onboarding capability |
| `@executioncontrolprotocol/format-toon` | `packages/extensions/format-toon` | Encode/decode TOON |
| `@executioncontrolprotocol/format-mermaid` | `packages/extensions/format-mermaid` | Manifest → Mermaid source |
| `@executioncontrolprotocol/chrome-ai` | `packages/extensions/chrome-ai` | Chrome **`LanguageModel`** provider (default) |
| `@executioncontrolprotocol/openai` | `packages/extensions/openai` | OpenAI Chat Completions |
| `@executioncontrolprotocol/claude` | `packages/extensions/claude` | Anthropic Messages API |
| `@executioncontrolprotocol/fal` | `packages/extensions/fal` | FAL image/model inference (`generate`) |
| `@executioncontrolprotocol/image-sharp` | `packages/extensions/image-sharp` | Image inspect/transform capabilities (describe + authoring; native `sharp` runs on Node only) |
| `@executioncontrolprotocol/policies` (standard) | `packages/policies` | Including `@executioncontrolprotocol/registry-control` |

Source: [`packages/runtimes/browser/src/environment.ts`](https://github.com/GuillaumeCleme/executioncontrolprotocol/blob/main/packages/runtimes/browser/src/environment.ts).

### 2.2 Demo app environment manifest

`createDemoAppEnvironment()` builds on `createBrowserDemoEnvironment("browser-demo-app")` with Chrome AI, format extensions, and model providers bound for authoring and workflow steps. The demo does **not** bind `@executioncontrolprotocol/test` (that extension is for monorepo unit tests and eval fixtures only).

Source: [`src/lib/demo-environment.ts`](../src/lib/demo-environment.ts).

### 2.3 Policy

`@executioncontrolprotocol/registry-control` allows namespaces: `@executioncontrolprotocol/chrome-ai`, `@executioncontrolprotocol/openai`, `@executioncontrolprotocol/claude`, `@executioncontrolprotocol/fal`, `@executioncontrolprotocol/image-sharp`, `@executioncontrolprotocol/browser`, `@customer/*`.

---

## 3. Capabilities reference (browser demo)

### 3.1 Model providers (`generate`)

Used **only** through harness invoke for chat and authoring. Shared input shape from authoring:

```ts
{
  prompt: string,   // multi-line user + context (see section 4)
  system?: string // instruction line (provider support varies)
}
```

| Capability | Provider | Bound in env | `system` honored? | Notes |
| ---------- | -------- | ------------ | ----------------- | ----- |
| `@executioncontrolprotocol/chrome-ai.generate` | Chrome `LanguageModel` | Yes | **Yes** → `systemPrompt` on `create()` | Default provider; throws if model not `available` |
| `@executioncontrolprotocol/openai.generate` | OpenAI API | Yes (needs key) | Varies | Bound when API key present |
| `@executioncontrolprotocol/claude.generate` | Anthropic API | Yes (needs key) | **Yes** | Bound when API key present |

**UI mapping** ([`provider-mode.ts`](../src/lib/provider-mode.ts)):

| `ProviderMode` | Capability invoked |
| -------------- | -------------------- |
| `chrome-ai` | `@executioncontrolprotocol/chrome-ai.generate` |
| `openai` | `@executioncontrolprotocol/openai.generate` |
| `claude` | `@executioncontrolprotocol/claude.generate` |

OpenAI extension also exposes `@executioncontrolprotocol/openai.generate`, `@executioncontrolprotocol/openai.evaluate`—not used by the browser demo chat/authoring path today.

### 3.2 Chrome AI install / availability

| Capability | Purpose |
| ---------- | ------- |
| `@executioncontrolprotocol/chrome-ai.checkAvailability` | Returns `{ available, supported, status }` (unsupported, unavailable, downloadable, downloading, available) |
| `@executioncontrolprotocol/chrome-ai.startModelDownload` | Triggers `LanguageModel.create({ monitor })`; download progress via `downloadprogress` events |
| `@executioncontrolprotocol/chrome-ai.getModelInstallState` | Pollable `{ phase, loaded?, total?, error? }` for UI |

Implementation: [`packages/extensions/chrome-ai/src/model-install.ts`](../packages/extensions/chrome-ai/src/model-install.ts).

### 3.3 Guided onboarding (no model)

| Capability | Input | Output | Model |
| ---------- | ----- | ------ | ----- |
| `@executioncontrolprotocol/browser.guideChat` | `{ message: string }` | `{ text: string }` | Keyword templates (no LLM) |

### 3.4 Format / encoding (no LLM)

| Capability / API | Direction | Used for |
| ---------------- | --------- | -------- |
| `@executioncontrolprotocol/format-toon` encode/decode | Manifest ↔ TOON | Authoring pipeline, panels |
| `@executioncontrolprotocol/format-mermaid` encode | Manifest → Mermaid | Graph tab (`direction: "LR"`) |
| `ecp.encode(manifest).as("fluent")` | Manifest → Fluent TS | Code sidebar (browser import) |
| `ecp.validate(manifest)` | Structural + binding checks | Validation overlay |
| `ecp.patch(manifest)` | Apply `@executioncontrolprotocol.patch` TOON | Patch path after model returns patch TOON |

### 3.5 Workflow execution

| Capability | Input | Output |
| ---------- | ----- | ------ |
| `@executioncontrolprotocol/chrome-ai.generate` | `{ prompt: string, system?: string, ... }` | `{ text: string }` |

Demo-generated workflows may reference `@executioncontrolprotocol/chrome-ai.generate` for on-device summarization and similar steps when Chrome AI is available.

### 3.6 Image workflows (FAL + image-sharp)

| Extension | Capability examples | Config | Browser run |
| --------- | ------------------- | ------ | ----------- |
| `@executioncontrolprotocol/fal` | `@executioncontrolprotocol/fal.generate` | `apiKey` via `browser("FAL_KEY")` in vault; step `input` requires FAL endpoint payload (`endpoint?`, `input`, `mode?`) | **Yes** — calls FAL from the browser |
| `@executioncontrolprotocol/image-sharp` | `inspect`, `metadata`, `transform`, `resize`, `crop`, `convert`, `composite`, … | Extension binding `{}`; steps pass `image` (buffer/base64/path per schema) | **Describe/author only** — native `sharp` is not available in the browser bundle; execution fails at runtime until a Node host runs the same manifest |

Store `FAL_KEY` in the encrypted vault (Settings → encrypted API keys) alongside OpenAI and Claude keys. Harness authoring summaries include required vs optional fields from each capability schema so models can propose valid `WITH` blocks.

Reference workflow: [`examples/03-fal-chain/workflow.ts`](https://github.com/GuillaumeCleme/executioncontrolprotocol/blob/main/examples/03-fal-chain/workflow.ts) in the protocol repo.

---

## 4. System and user prompts (authoring path)

All workflow creation and patching goes through [`BrowserAuthoringService`](../packages/runtimes/browser/src/authoring/browser-authoring-service.ts). The service **always**:

1. Calls `ecp.describe()` and encodes the descriptor to compact TOON.
2. Invokes the selected `*.generate` with a constructed **prompt** and **system** string.
3. Decodes returned text as TOON → `@executioncontrolprotocol.workflow` or `@executioncontrolprotocol.patch`.
4. Validates and encodes panels.

### 4.1 Create workflow

**System prompt (fixed):**

```text
Return only ECP TOON workflow text. No markdown fences.
```

**User prompt (assembled):**

```text
Return only a compact TOON @executioncontrolprotocol.workflow document for this request.
User request: <user chat text>
Environment descriptor (TOON):
<compact describe() TOON>
```

**Post-processing:** `ecp.decode(text).uses("@executioncontrolprotocol/format-toon").to("@executioncontrolprotocol.workflow")` → `validate` → `encodePanels`.

### 4.2 Patch workflow

**System prompt (fixed):**

```text
Return only ECP TOON patch document. No markdown fences.
```

**User prompt (assembled):**

```text
Return only compact TOON for schema @executioncontrolprotocol.patch.
User request: <user chat text>
Environment descriptor (TOON):
<descriptor TOON>
Current workflow (TOON):
<current workflow TOON>
```

**Post-processing:** decode to `@executioncontrolprotocol.patch` → `ecp.patch(manifest)` → validate → encode panels (patch TOON kept in Patch tab).

### 4.3 What each provider actually receives

| Provider | System | User content |
| -------- | ------ | ------------ |
| **Chrome AI** | Passed as `systemPrompt` on session | Full assembled **prompt** string as single user turn |
| **Claude** | Anthropic `system` parameter | `prompt` as user message |
| **OpenAI** | *Dropped* — not in `GenerateInput` | Entire assembled string as user message only |
| **Demo** | Ignored | Inspects `prompt` for `@executioncontrolprotocol.patch` / `schema @executioncontrolprotocol.patch` vs default workflow template |

**Implication for Chrome Nano:** The model sees one combined user blob plus a short system line demanding raw TOON. Nano must follow strict format constraints while also reading environment + workflow context in the user block. There is **no** separate “chat personality” system prompt on the authoring path.

**Implication for evaluation:** Compare providers on identical `BrowserAuthoringService` prompts; fix OpenAI to forward `system` if parity matters.

---

## 5. Chat intent routing (current “intent filters”)

Intent is **not** implemented inside model providers. It lives in the **demo app** in two layers.

### 5.1 Assistant mode

| Mode | When | Chat behavior |
| ---- | ---- | ------------- |
| `guided` | Explore-first or Chrome install in background | FAQ unless workflow keywords match |
| `authoring` | Provider selected or after workflow-like guided message | Always `BrowserAuthoringService` |

State: `assistantMode` in [`App.tsx`](../src/App.tsx).

### 5.2 `looksLikeWorkflowRequest` (keyword router)

Source: [`src/lib/chat-routing.ts`](../src/lib/chat-routing.ts).

**Treat as workflow authoring if:**

- Contains `patch`, `update workflow`, or `change workflow`, **or**
- Contains (`create` \| `build` \| `generate` \| `add step`) **and** (`workflow` \| `echo` \| `step`).

**Otherwise in guided mode:** invoke `@executioncontrolprotocol/browser.guideChat` (templates, no LLM).

**Otherwise in authoring mode:** always authoring (create or patch via `BrowserAuthoringService`).

**Provider used for authoring:**

```ts
const cap =
  assistantMode === "guided"
    ? providerCapabilityId("demo")      // always demo in guided
    : providerCapabilityId(providerMode) // chrome-ai | openai | claude | demo
```

After a successful workflow-like message in guided mode, UI switches to `authoring`.

### 5.3 Gaps vs desired “intent filters”

| Gap | Risk |
| --- | ---- |
| Keyword-only routing | “Make an echo flow” may miss; “tell me about create workflows” may false-positive |
| No LLM intent classifier | Nano never used for “explain validation” in authoring mode—gets full TOON prompt |
| Guided path never uses Chrome | Even after Nano is ready, user may stay on demo until they select chrome-ai in settings |
| `guideChat` duplicates keyword logic | Overlap with `looksLikeWorkflowRequest` for “create workflow” phrasing |
| Authoring always TOON-shaped prompts | General questions in authoring mode hit wrong task template |
| OpenAI ignores `system` | Weaker format adherence vs Claude/Chrome |

---

## 6. Chrome Gemini Nano: install UX vs chat behavior

### 6.1 Install flow (implemented)

1. First-run: user can pick Chrome AI, explore with guided mode, or install with dialog/toast.
2. `startModelDownload` → `LanguageModel.create({ monitor })` with progress polling.
3. On ready: `providerMode = chrome-ai`, `assistantMode = authoring`, ECP `terminate` + recreate environment, **preserve** manifest/panels/chat.

### 6.2 Nano for “basic queries”

Today Nano is **only** invoked when:

- `assistantMode === "authoring"` **and** `looksLikeWorkflowRequest` is true (guided uses demo), **or**
- User is in authoring mode and sends any message (always authoring—not just workflow intent).

There is **no** path that sends a short general system prompt to Nano for Q&A. Options for ideation:

| Approach | Description |
| -------- | ----------- |
| **A. Three-way router** | `general` → Nano/Claude with chat system prompt; `workflow` → `BrowserAuthoringService`; `help` → `guideChat` |
| **B. Nano chat + service split** | New `BrowserChatService` with `{ message }` and a general ECP assistant system prompt |
| **C. Classifier capability** | Small `*.classifyIntent` using Nano with JSON schema (workflow, faq, other) |
| **D. Unified prompt with tool-style output** | Single Nano call—fragile for TOON vs prose |

Recommendation: **A + C** — explicit intent enum; only workflow intents get TOON system prompts and descriptor/workflow context.

---

## 7. Panel encoding hub (reasoning about extensions)

From `encodePanels` ([`browser-authoring-service.ts`](../packages/runtimes/browser/src/authoring/browser-authoring-service.ts)):

```text
WorkflowManifest (canonical JSON hub)
  ├─ ecp.encode().as("fluent")     → Code sidebar (Workflow tab)
  ├─ ecp.encode().uses("@executioncontrolprotocol/format-toon") → TOON tab
  ├─ ecp.encode().uses("@executioncontrolprotocol/format-mermaid").with({ direction: "LR" }) → Graph
  └─ JSON.stringify(canonical)     → JSON tab
```

Fluent edits compile in the browser (`compileWorkflowSource`) and re-enter the same hub—no parallel pipeline.

---

## 9. How to reason about extension + model combinations

| Goal | Use | Avoid |
| ---- | --- | ----- |
| Teach UI / ECP concepts offline | `guideChat` or future Nano general prompt | `BrowserAuthoringService` |
| Generate/edit workflow | `BrowserAuthoringService` + chosen `*.generate` | Raw `invoke(generate)` without TOON decode/validate |
| Reliable CI / no keys | `demo` provider | chrome-ai / openai / claude |
| On-device privacy | `chrome-ai` after install | Sending descriptor TOON to cloud |
| Best TOON adherence | Claude or Chrome (system honored) | OpenAI until `system` forwarded |
| Run steps | `ecp.run` + manifest with valid `uses` | Invoking echo directly from chat |
| See bound capabilities | `ecp.describe()` / Environment code tab | Hard-coding capability lists in UI |

**Descriptor in every authoring prompt:** The environment TOON tells the model which capabilities exist (from bindings). If you add extensions, **re-describe** or regenerate after bind changes so prompts stay accurate.

---

## 10. Related plans and docs

| Document | Content |
| -------- | ------- |
| [`docs/ecp-browser-demo.md`](ecp-browser-demo.md) | Phased plan: UI, providers, Chrome extension |
| Chrome install UX plan | Guided onboarding, install dialog/toast (implemented) |
| Solaris Slate UI plan | Layout, theme (implemented) |
| [`README.md`](../README.md) | Dev commands, panel encoding note |

---

## 11. Suggested next steps (intent + prompts)

1. **Introduce `Intent` enum** — `faq` \| `workflow-create` \| `workflow-patch` \| `general` (and maybe `run`).
2. **Classifier** — Keywords first; optional Nano call with tiny JSON-only system prompt when keywords ambiguous.
3. **Split prompts** — `AuthoringPrompts` module: TOON system/user templates only for workflow intents; `ChatPrompts` for Nano/Claude general Q&A with short ECP context (no full descriptor unless user asks environment questions).
4. **Align OpenAI** — Add `system?: string` to `@executioncontrolprotocol/openai.generate` and pass it through to Chat Completions API.
5. **Chrome general chat** — After install, route `faq`/`general` to Nano with non-TOON system message; keep authoring on strict TOON system.
6. **Telemetry** — Log intent, provider, and decode/validation success to compare Nano vs cloud on workflow tasks.
7. **Tests** — Golden files for prompt assembly; table-driven intent routing cases.

---

## 12. Quick reference: invoke paths from UI

| User action | Code path | Capability / API |
| ----------- | --------- | ---------------- |
| Chat (guided, FAQ) | `App.onSubmit` → | `@executioncontrolprotocol/browser.guideChat` |
| Chat (workflow) | `BrowserAuthoringService` → | `*.generate` |
| Execute | `ecp.run(manifest)` | Step `uses` e.g. `@executioncontrolprotocol/chrome-ai.generate` |
| Edit Fluent | `compileWorkflowSource` → `applyPanels` | validate + encode |
| Settings / first run | Provider modal | chrome install capabilities |
| Refresh capabilities view | `describe()` | (descriptor only) |

---

*Generated from the codebase state after Chrome install UX and Solaris Slate UI implementation. For exact line-level behavior, follow links to source files above.*
