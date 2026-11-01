/**
 * The standard "make sure this exists" call every kind of resource includes in its contract (design page, decided
 * 2026-11-01: "each resource kind is a connector abstract with a standard 'make sure this exists' call"). A kind's
 * contract types it as `resource.ensureInstance`, an action taking `{ instance, caller, ... }` and answering
 * `EnsureInstanceResult<Instance>`, where `Instance` is the kind's declaration of one instance (for a package
 * registry, `{ packageName }`). The component records each instance in its own tables. Idempotent: the installing app
 * calls it every time a caller is about to use the instance, so a provisioning that failed is redone by the next call.
 *
 * Written without intersections, the way Convex generates types, because the build compares the kind's contract with
 * the component's generated `ComponentApi` for exact equality.
 */

/**
 * Who is asking: a code repository's deploy job, as the installing app verified it (`@jive-sh/server` from the job's
 * GitHub Actions ID token). `codeRepository.id` is the app's id for the repository, stable across renames; an
 * instance a repository provisioned is bound to that id.
 */
export type ResourceCaller = {
  codeRepository: { id: string; owner: string; name: string };
  /** The GitHub Actions environment the job runs in, e.g. "latest". */
  environment: string;
  /** The workflow file the job runs, e.g. "pipeline.yml". */
  workflowFile: string;
};

/**
 * - `ready`: the instance exists and the caller may use it. `instanceId` is the component's id for it, stable across
 *   calls.
 * - `inProgress`: another caller is provisioning the same instance; ask again after `retryAfterSeconds`.
 * - `personNeeded`: the outside system wants a person first (npm's second factor, say) on its own page, `url`.
 * - `refused`: the caller may not have this instance; `reason` says what to change.
 */
export type EnsureInstanceResult<Instance> =
  | { status: "ready"; instanceId: string; instance: Instance }
  | { status: "inProgress"; retryAfterSeconds: number }
  | { status: "personNeeded"; reason: string; url: string }
  | { status: "refused"; reason: string };
