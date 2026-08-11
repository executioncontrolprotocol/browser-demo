# Browser demo follow-ups

Track temporary workarounds and protocol-side work that this app depends on.

## Open

_(none)_

## Done

### Remove harness prompt fixture glob shim

| | |
| --- | --- |
| **Status** | Done (`@executioncontrolprotocol/*@0.10.1`) |
| **Why it existed** | `0.10.0` harness browser loaders used `import.meta.glob("../../../fixtures/...")` from `dist/prompts/`, so Vite inlined an empty fixture map (`Harness prompt fixture not found: intent-classification`). |
| **Resolution** | ECP published `0.10.1` with `../../fixtures/...`. Demo depends on `^0.10.1`; the Vite `transform` rewrite was removed. |
