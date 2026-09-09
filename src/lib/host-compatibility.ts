import { LATEST_ECP_VERSION } from "@executioncontrolprotocol/types"
import type {
  EnvironmentDescriptor,
  ValidationResult,
} from "@executioncontrolprotocol/types"

const HOST_CAPABILITY_MISSING = "HOST_CAPABILITY_MISSING"

/**
 * Compare browser host/mixed capabilities against a paired host describe().
 * Unpaired (no host descriptor) returns a valid empty result.
 */
export function checkHostMixedCompatibility(
  browserDescriptor: EnvironmentDescriptor,
  hostDescriptor: EnvironmentDescriptor | null | undefined
): ValidationResult {
  const result: ValidationResult = {
    schema: "@executioncontrolprotocol.validation.result",
    version: LATEST_ECP_VERSION,
    valid: true,
    errors: [],
    warnings: [],
  }

  if (!hostDescriptor) {
    return result
  }

  const hostIds = new Set((hostDescriptor.capabilities ?? []).map((c) => c.id))
  for (const cap of browserDescriptor.capabilities ?? []) {
    if (cap.execution !== "host" && cap.execution !== "mixed") continue
    if (hostIds.has(cap.id)) continue
    result.valid = false
    result.errors.push({
      code: HOST_CAPABILITY_MISSING,
      message:
        `Host is missing ${cap.id} — restart \`ecp up --env …\` with an environment that binds that extension.`,
      path: `capabilities.${cap.id}`,
      severity: "error",
    })
  }

  return result
}

/** Merge workflow validation with host-compat errors (host gaps win when both present). */
export function mergeValidationResults(
  workflow: ValidationResult | null,
  hostCompat: ValidationResult | null
): ValidationResult | null {
  if (!workflow && !hostCompat) return null
  if (!workflow) return hostCompat
  if (!hostCompat) return workflow
  if (hostCompat.valid) return workflow
  return {
    schema: "@executioncontrolprotocol.validation.result",
    version: LATEST_ECP_VERSION,
    valid: false,
    errors: [...hostCompat.errors, ...(workflow.valid ? [] : workflow.errors)],
    warnings: [
      ...hostCompat.warnings,
      ...(workflow.valid ? [] : workflow.warnings),
    ],
  }
}
