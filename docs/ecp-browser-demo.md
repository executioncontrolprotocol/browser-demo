# ECP Browser Demo Implementation Plan

## Phase 1: Validate formatters, encoders, decoders, compaction, and patching

### Goal

Prove the ECP document toolchain works before building the browser app.

This phase validates:

```txt
Fluent API → JSON manifest → TOON → JSON manifest → Fluent API
TOON patch → JSON patch → patched manifest → validation → compact TOON
```

This is the foundation for the browser demo. No UI work should start until this loop is stable.

---

## Phase 1.1: Validate `env.init()` and `Ecp` operational instance

### Tasks

Implement or verify:

```ts
const env = environment("test-env")
  .withExtensions([
    extension("@executioncontrolprotocol/format-toon").with({}),
  ]);

const ecp = await env.init();
```

Operational methods live on `ecp`:

```ts
ecp.describe()
ecp.search()
ecp.encode()
ecp.decode()
ecp.patch()
ecp.validate()
ecp.invoke() // Phase 2
ecp.terminate()
```

### Acceptance criteria

* `env.init()` returns an initialized `Ecp` instance.
* `ecp.terminate()` fires `environment:terminate`.
* `environment:configuring` and `environment:ready` fire during init.
* Runtime, extensions, policies, registry, and config resolvers are bound before `ecp` is returned.
* Operational methods are not required on the environment builder.

---

## Phase 1.2: Validate encode/decode result shape

### Tasks

Ensure all encode/decode results use `.result`.

Do not return shapes that require:

```ts
encoded.content
decoded.document
```

Use:

```ts
encoded.result
decoded.result
patched.result
```

### Result types

```ts
interface EncodeResult<T = unknown> {
  schema: "@executioncontrolprotocol.encode.result";
  version: EcpVersion;
  success: boolean;
  format: string;
  sourceSchema?: EcpSchema;
  sourceVersion?: EcpVersion;
  result?: T;
  validation?: ValidationResult;
  diagnostics: ValidationIssue[];
}
```

```ts
interface DecodeResult<T = unknown> {
  schema: "@executioncontrolprotocol.decode.result";
  version: EcpVersion;
  success: boolean;
  targetSchema?: EcpSchema;
  targetVersion?: EcpVersion;
  result?: T;
  validation?: ValidationResult;
  diagnostics: ValidationIssue[];
}
```

### Acceptance criteria

* Encode success returns `success: true` and `result`.
* Decode success returns `success: true` and `result`.
* Encode/decode failures return `success: false`, `validation`, and `diagnostics`.
* `strict: true` may throw typed errors with validation attached.
* All tests avoid `.content` and `.document`.

---

## Phase 1.3: Validate `@executioncontrolprotocol/format-toon`

### Tasks

Extend or validate existing `@executioncontrolprotocol/format-toon`.

It must support:

```txt
@executioncontrolprotocol.workflow encode
@executioncontrolprotocol.workflow decode
@executioncontrolprotocol.patch encode
@executioncontrolprotocol.patch decode
header config
compact config
```

Encoder input must accept a standard extensible options interface:

```ts
export interface EcpFormatOptions extends Record<string, unknown> {
  headers?: boolean;
  compact?: boolean;
  as?: "object" | "string";
}
```

### Example

```ts
const toon = await ecp
  .encode(manifest)
  .uses("@executioncontrolprotocol/format-toon")
  .to("@executioncontrolprotocol.workflow")
  .with({ headers: false, compact: true })
  .process();
```

### Acceptance criteria

* Headered workflow TOON works.
* Headerless workflow TOON works.
* Headerless decode works when `.to("@executioncontrolprotocol.workflow")` is provided.
* Headerless patch decode works when `.to("@executioncontrolprotocol.patch")` is provided.
* Compact mode removes unnecessary schema/version headers when requested.
* Decode failures include diagnostics.
* Decode output validates against the requested schema.

---

## Phase 1.4: Validate core Fluent authoring

### Tasks

Implement or validate built-in Fluent rendering in `@executioncontrolprotocol/core` (not an extension).

Purpose:

```txt
@executioncontrolprotocol.workflow JSON manifest → Fluent API source  (renderWorkflowToFluent / ecp.encode().as("fluent"))
@executioncontrolprotocol.workflow Fluent/TS source → JSON manifest   (compileWorkflowSource / ecp compile)
```

Important decision:

> Do not render IDs into Fluent API. IDs belong in JSON serializable objects. If an LLM edits Fluent API, it can edit the code directly.

### Example output

```ts
export default workflow("Weekly Brief")
  .run([
    step("@executioncontrolprotocol/memory.search", "Collect Signals")
      .with({
        query: "weekly risks and decisions",
      })
      .as("signals"),

    step("@executioncontrolprotocol/openai.generate", "Write Brief")
      .with({
        prompt: "Create a concise brief",
        context: ref("signals.results"),
      })
      .as("brief"),
  ]);
```

No:

```ts
.id("write-brief")
```

### Acceptance criteria

* Manifest encodes to valid Fluent API source.
* Generated Fluent source compiles back into an equivalent manifest.
* No `.id(...)` is emitted.
* `ref(...)`, `state(...)`, and `expr.*(...)` render correctly.
* Workflow, step order, inputs, outputs, and conditions are preserved.

---

## Phase 1.5: Validate lightweight patching

### Tasks

Implement or validate `@executioncontrolprotocol.patch`.

Canonical patch:

```ts
interface EcpPatchDocument {
  schema: "@executioncontrolprotocol.patch";
  version: EcpVersion;
  targetSchema: EcpSchema;
  patches: EcpPatchEntry[];
}
```

```ts
interface EcpPatchEntry {
  path: string;
  mode?: "merge" | "replace";
  value: unknown;
  reason?: string;
}
```

No:

```txt
op
format
```

Patch shorthand accepted by `ecp.patch().with(...)`:

```ts
type EcpPatchInput =
  | EcpPatchDocument
  | EcpPatchEntry[]
  | Record<string, unknown>;
```

### Patch path convention

Use:

```txt
workflow.<property>
steps[<stepId>].<property>
```

Examples:

```txt
workflow.label
steps[write-brief].uses
steps[write-brief].input.prompt
steps[write-brief].input.options.maxWords
steps[write-brief].when
```

Use step IDs, not labels.

### Lodash requirement

Use lodash internally:

```ts
import get from "lodash/get";
import set from "lodash/set";
import merge from "lodash/merge";
import cloneDeep from "lodash/cloneDeep";
```

### Acceptance criteria

* Shorthand patch works:

```ts
const patched = await ecp
  .patch(manifest)
  .with({
    "steps[write-brief].input": {
      prompt: "Create a concise executive brief.",
    },
  })
  .process();
```

* Default mode is deep merge.
* `mode: "replace"` fully replaces the selected value.
* Original manifest is not mutated.
* Duplicate step IDs fail patching with `DUPLICATE_STEP_ID`.
* Missing paths fail with `PATCH_PATH_NOT_FOUND`.
* Patched manifest is validated with Zod/schema validation.
* Patch result uses `.result`.

---

## Phase 1.6: Validate full round trip

### Required test

```txt
Fluent API source
→ compileWorkflowSource
→ JSON manifest A
→ ecp.encode(...).uses("@executioncontrolprotocol/format-toon")
→ TOON
→ ecp.decode(...).uses("@executioncontrolprotocol/format-toon")
→ JSON manifest B
→ ecp.encode(...).as("fluent")
→ Fluent API source
→ compileWorkflowSource
→ JSON manifest C
```

### Assertion

```ts
expect(normalizeWorkflowManifest(manifestC))
  .toEqual(normalizeWorkflowManifest(manifestA));
```

### Patch round trip

```txt
TOON patch
→ decode to @executioncontrolprotocol.patch
→ ecp.patch(manifest)
→ patched manifest
→ validate
→ encode compact TOON
→ encode Fluent API
```

### Acceptance criteria

* Full workflow round trip passes.
* Patch round trip passes.
* All access uses `.result`.
* Validation failures are available to the caller.
* No browser app code required.

---

# Phase 2: Direct capability invocation from initialized ECP

## Goal

Allow the browser app to reuse registered ECP capabilities directly without duplicating implementation code.

This solves the model-call split:

| Use case                | Access pattern                                                  |
| ----------------------- | --------------------------------------------------------------- |
| Workflow step execution | `step("@executioncontrolprotocol/chrome-ai.generateText").with(...)`                 |
| Browser app authoring   | `ecp.invoke("@executioncontrolprotocol/chrome-ai.generateText").with(...).process()` |

The browser app owns the orchestration. ECP owns capability registration and execution.

---

## Phase 2.1: Add `ecp.invoke(...)`

### API

```ts
const response = await ecp
  .invoke("@executioncontrolprotocol/chrome-ai.generateText")
  .with({
    prompt,
    system: "Return only ECP TOON patch.",
  })
  .process();
```

### Types

```ts
interface InvokeOperationBuilder {
  with(input: unknown): this;
  process<T = unknown>(): Promise<InvokeResult<T>>;
}
```

```ts
interface InvokeResult<T = unknown> {
  schema: "@executioncontrolprotocol.invoke.result";
  version: EcpVersion;
  success: boolean;
  capabilityId: string;
  result?: T;
  validation?: ValidationResult;
  diagnostics: ValidationIssue[];
  usage?: UsageSummary;
}
```

### Acceptance criteria

* `ecp.invoke(capabilityId)` resolves registered capabilities.
* Input validates against the capability input schema.
* Output validates against the capability output schema.
* Result uses `.result`.
* Failure returns validation and diagnostics.
* Direct invocation does not emit workflow run/step lifecycle events.
* Direct invocation does not commit workflow state.
* Direct invocation can be used by browser app services.

---

## Phase 2.2: Policy behavior for direct invocation

### Decision

Direct invocation is not workflow execution, but it should be policy-aware.

Use existing policy hooks with a context scope:

```ts
{
  scope: "invoke",
  capabilityId,
  input,
}
```

### Acceptance criteria

* Policies can deny invocation.
* Policies can inspect capability ID and input.
* Direct invoke does not trigger run lifecycle.
* Cost/token policy can later operate on direct invocations.

---

## Phase 2.3: Model provider capabilities

### Required model provider extensions

Implement minimal model providers:

```txt
@executioncontrolprotocol/chrome-ai
@executioncontrolprotocol/openai
@executioncontrolprotocol/claude
```

Each should expose at least:

```txt
.generateText
```

### Chrome AI extension

Capabilities:

```txt
@executioncontrolprotocol/chrome-ai.checkAvailability
@executioncontrolprotocol/chrome-ai.generateText
```

### OpenAI extension

```txt
@executioncontrolprotocol/openai.generateText
```

### Claude extension

```txt
@executioncontrolprotocol/claude.generateText
```

### Acceptance criteria

* Browser app can call model capability through `ecp.invoke(...)`.
* Model capability can also be used in workflow steps.
* API keys are read from session config when needed.
* Chrome AI availability can be checked before provider selection.
* Providers return a consistent shape, for example:

```ts
{
  text: string;
  usage?: UsageSummary;
}
```

---

# Phase 3: Browser application package

## Goal

Build the browser demo app as a separate package. The browser app uses ECP but is not itself the browser runtime.

Suggested package:

```txt
executioncontrolprotocol-browser-demo (repo root)
```

Suggested stack:

```txt
Vite
React
TypeScript
Monaco editor
Mermaid or React Flow later
Tailwind or simple CSS
```

---

## Phase 3.1: Build app shell

### UI principle

> The chat panel is always docked to the bottom of the screen. The chat input is always at the bottom edge. Progressive disclosure happens by changing chat panel height and revealing workspace panels behind it.

### Layout states

```ts
type WorkspaceLayout =
  | "empty"
  | "workflow-full"
  | "code-full"
  | "split-code-workflow";

type ChatPanelState =
  | "expanded"
  | "compact"
  | "collapsed";
```

### Initial state

```ts
{
  workspace: "empty",
  chat: "expanded"
}
```

### Acceptance criteria

* App opens to a flat dark canvas.
* Bottom-docked chat panel is expanded.
* Chat input is always at the bottom.
* Chat panel height changes without moving its anchor.
* Workspace content gets bottom padding equal to chat height.

---

## Phase 3.2: Implement progressive workspace panels

### Workflow reveal

* Workflow slides in from the right.
* Default can occupy full screen behind the chat.
* Chat remains bottom-docked.

### Code reveal

* Code slides in from the left.
* If workflow is open, layout becomes 50/50.
* If workflow is closed, code occupies 100%.

### Panel behavior

| Action                          | Workspace result      |
| ------------------------------- | --------------------- |
| First workflow generated        | `workflow-full`       |
| Show workflow                   | `workflow-full`       |
| Show code while workflow open   | `split-code-workflow` |
| Show code while workflow closed | `code-full`           |
| Close workflow while code open  | `code-full`           |
| Close code while workflow open  | `workflow-full`       |
| Close both                      | `empty`               |

### Acceptance criteria

* Workflow panel animates from right.
* Code panel animates from left.
* Split view is stable and resizable later.
* Chat stays docked at the bottom in all states.

---

## Phase 3.3: Implement bottom-docked chat panel

### States

Expanded:

```txt
60–70vh
```

Compact:

```txt
220–320px
```

Collapsed:

```txt
64–88px
```

### Content by state

| State     | Shows                               |
| --------- | ----------------------------------- |
| Expanded  | Chat history, agent messages, input |
| Compact   | Recent messages/actions, input      |
| Collapsed | Latest action/status, input         |

### Acceptance criteria

* Input always pinned to bottom.
* Chat history scrolls above input.
* Collapsed state still supports command input.
* Chat can expand/collapse without changing workspace layout except bottom padding.

---

## Phase 3.4: Build UI views

### Code panel tabs

```txt
Fluent API
JSON manifest
TOON
Patch
```

Default:

```txt
Fluent API
```

### Workflow panel tabs

```txt
Graph
Validation
Capabilities
```

Default:

```txt
Graph
```

### Acceptance criteria

* Monaco renders Fluent API.
* JSON manifest view renders readable JSON.
* TOON view renders compact TOON.
* Patch view renders latest patch or patch result.
* Graph view renders Mermaid initially.
* Validation tab renders schema diagnostics.

---

## Phase 3.5: First-run modal

### Options

```txt
Use Chrome built-in AI
Use OpenAI
Use Claude
Continue in demo mode
```

### State

```ts
type ProviderMode =
  | "chrome-ai"
  | "openai"
  | "claude"
  | "demo";
```

### Acceptance criteria

* Modal appears on first launch.
* Chrome AI availability is checked.
* If Chrome AI is unavailable, user can select OpenAI, Claude, or demo mode.
* API keys are session-only and not persisted.
* Demo mode always works.

---

## Phase 3.6: Browser app authoring service

Do not implement workflow authoring as a required ECP extension.

Implement a browser app service:

```ts
class BrowserAuthoringService {
  constructor(private ecp: Ecp) {}

  async createWorkflow(input: {
    userRequest: string;
    providerCapabilityId: string;
  }): Promise<CreateWorkflowResult>;

  async patchWorkflow(input: {
    userRequest: string;
    manifest: WorkflowManifest;
    providerCapabilityId: string;
  }): Promise<PatchWorkflowResult>;
}
```

### Responsibilities

```txt
describe
compact descriptor
compact workflow
build model prompt
invoke provider capability
decode TOON workflow or patch
apply patch
validate
encode Fluent / TOON / Mermaid
return UI-ready state
```

### Acceptance criteria

* Browser app owns authoring orchestration.
* No `@executioncontrolprotocol/workflow-author.patch` is required.
* No duplicate model provider implementation.
* Model is invoked through `ecp.invoke(...)`.

---

## Phase 3.7: Prompted edit flow

### Flow

```txt
User asks for change
↓
ecp.describe()
↓
ecp.encode(descriptor).uses("@executioncontrolprotocol/format-toon")
↓
ecp.encode(manifest).uses("@executioncontrolprotocol/format-toon")
↓
ecp.invoke(selectedModel.generateText)
↓
ecp.decode(model.result.text).uses("@executioncontrolprotocol/format-toon").to("@executioncontrolprotocol.patch")
↓
ecp.patch(manifest).with(patch.result)
↓
ecp.validate(patched.result)
↓
ecp.encode(patched.result).as("fluent")
↓
ecp.encode(patched.result).uses("@executioncontrolprotocol/format-toon")
↓
ecp.encode(patched.result).uses("@executioncontrolprotocol/format-mermaid")
```

### Acceptance criteria

* User prompt produces TOON patch.
* TOON patch decodes to `@executioncontrolprotocol.patch`.
* Patch applies to manifest.
* Validation result is displayed.
* Code and workflow update live.

---

## Phase 3.8: Workflow creation flow

### Flow

```txt
User asks for a new workflow
↓
Descriptor compacted
↓
Model returns TOON workflow
↓
TOON decodes to @executioncontrolprotocol.workflow
↓
Workflow validates
↓
Fluent/TOON/Mermaid views update
↓
Workflow panel reveals
```

### Acceptance criteria

* New workflow can be generated from prompt.
* Workflow panel opens automatically.
* Chat can collapse after workflow generation.
* User can reveal code.

---

# Phase 4: Browser package features and integration

## Goal

Implement the browser package features needed by the app, while keeping the browser runtime focused on ECP execution and environment behavior, not web app concerns.

Package:

```txt
packages/runtimes/browser
```

---

## Phase 4.1: Browser runtime package

### Responsibilities

```txt
browser-safe ECP exports
@executioncontrolprotocol/browser runtime
browser-safe env.init()
Ecp instance in browser
no Node dependencies
```

### Acceptance criteria

* `@executioncontrolprotocol/browser` imports in Vite without Node polyfills.
* Browser runtime can initialize through `env.init()`.
* ECP instance can encode/decode/patch/validate in browser.
* No server/web-app-specific logic is in the runtime.

---

## Phase 4.2: Browser registry extension

### Config

```ts
extension("@executioncontrolprotocol/browser-registry").with({
  exposeGlobal: true,
  globalName: "ecp",
  allowRuntimeRegistration: true,
  autoBindRegisteredExtensions: true,
  freezeOn: "environment:beforeRun",
});
```

### Global

```ts
window.ecp
```

Suggested global surface:

```ts
window.ecp.registerExtension(def)
window.ecp.freezeRegistry(reason?)
window.ecp.isRegistryFrozen()
window.ecp.describe()
window.ecp.invoke(...)
```

Do not expose dynamic policy/runtime registration by default.

### Acceptance criteria

* Global is lowercase `window.ecp`.
* Dynamic extensions can register before freeze.
* Registry freezes on configured lifecycle hook.
* Policies, not extension config, govern namespace authorization.
* Dynamic extensions appear in `ecp.describe()` and can be invoked.

---

## Phase 4.3: Registry-control policy

### Responsibilities

Govern:

```txt
dynamic extension registration
allowed extension namespaces
denied extension namespaces
auto-bind permission
freeze requirement
```

### Acceptance criteria

* Dynamic extension registration is denied unless policy allows it.
* Deny wins over allow.
* Policies and runtimes are not dynamically registered in browser environments.
* Only extensions are dynamic.
* Policy is frozen in the environment.

---

## Phase 4.4: Browser session config extension

### Responsibilities

```txt
session-only config values
API key support
no persistence
no localStorage
```

### Acceptance criteria

* OpenAI/Claude keys can be stored in memory for current session.
* Keys are not serialized in descriptors, logs, manifests, or results.
* Keys are cleared on `ecp.terminate()`.
* Browser app can update session config after first-run modal.

---

## Phase 4.5: Chrome AI extension

### Capabilities

```txt
@executioncontrolprotocol/chrome-ai.checkAvailability
@executioncontrolprotocol/chrome-ai.generateText
```

### Acceptance criteria

* Availability check works.
* Unsupported browsers/devices return clear status.
* Supported Chrome can prepare/use local model.
* `generateText` can be used through `ecp.invoke(...)`.
* `generateText` can be used as a workflow step.

---

## Phase 4.6: OpenAI and Claude browser adapters

### Capabilities

```txt
@executioncontrolprotocol/openai.generateText
@executioncontrolprotocol/claude.generateText
```

### Acceptance criteria

* API keys resolve from browser session config.
* Direct invocation works through `ecp.invoke(...)`.
* Step usage works through workflow runtime when needed.
* Errors return diagnostics.
* Keys are not persisted.

---

## Phase 4.7: Test extension for workflow steps

Use `@executioncontrolprotocol/test` (`echo`, `summarize`, `validate`, etc.) for eval fixtures and local workflow examples. The browser demo defaults to **Chrome AI** (`@executioncontrolprotocol/chrome-ai.generate`) for harness chat and authoring — no offline fake model provider.

### Acceptance criteria

* Demo mode can generate deterministic outputs.
* Demo workflows can validate and render.
* Demo mode works without API keys or Chrome AI.

---

# Final build order

## Milestone 1: Format and document toolchain

```txt
env.init → Ecp
encode/decode
format-toon
core-fluent
patch
validation
full round-trip tests
```

## Milestone 2: Direct capability invocation

```txt
ecp.invoke
model provider capability reuse
policy-aware direct invocation
Chrome/OpenAI/Claude minimal generateText
```

## Milestone 3: Browser app

```txt
bottom-docked chat
progressive workflow/code reveal
Monaco
Mermaid
first-run modal
authoring service
prompted create/edit flows
```

## Milestone 4: Browser package integration

```txt
@executioncontrolprotocol/browser runtime
browser-registry
registry-control
browser-session-config
window.ecp
Chrome AI provider
cloud provider adapters
demo extension
```

This gives us a clean path: validate the substrate, add direct capability invocation, build the app, then harden the browser package integrations.

## Encrypted secrets vault (browser-secrets)

Cloud provider API keys (OpenAI, Claude) use the `@executioncontrolprotocol/browser-secrets` extension and the fluent helper `browser("KEY")`, which resolves from a passphrase-protected AES-GCM vault in `localStorage`.

### Demo UX

| Screen | When | Action |
| ------ | ---- | ------ |
| **Vault unlock** | Returning visit, vault exists, locked | Enter passphrase or choose "Explore without cloud keys" |
| **Vault setup** | Settings → encrypted API keys, no vault yet | Set + confirm passphrase |
| **Provider settings** | Settings modal, vault unlocked | Paste API keys → stored as `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` |

Provider mode (`ecp:browser-demo:provider-mode`) is still plain `localStorage`; only API keys are encrypted. Unlock the vault before cloud providers can resolve `browser(...)` bindings in the environment.
