/** Fallback if Node schema loader is resolved in the browser bundle (should not run). */
export function loadSchemaExampleNode(): never {
  throw new Error(
    "Schema example loader resolved Node path in browser — restart dev server after vite config changes"
  )
}

export function loadSchemaExampleEqlNode(): never {
  throw loadSchemaExampleNode()
}

export function loadRepairNeutralExampleEqlNode(): never {
  throw loadSchemaExampleNode()
}
