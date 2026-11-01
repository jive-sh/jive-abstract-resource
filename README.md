# jive-abstract-resource

A Jive abstract for **resources**: each package extending it defines a kind of resource an organization owns, as
a [Convex component](https://docs.convex.dev/components/authoring) published to npm: a Convex app such as
`@jive-sh/server` installs it with `app.use(...)` and calls its functions through `components.<name>`.

This package gives a resource package its scaffold, its package.json schema, and the six CI/CD hooks Jive's
reusable pipeline calls ([CICD_API.md](https://github.com/jive-sh/jive/blob/main/CICD_API.md)), through the
`jive-resource` CLI. It is a library, not a Convex component itself. A connector, a resource that links Jive to an outside system, is
the kind [`jive-abstract-resource-connector`](https://github.com/jive-sh/jive-abstract-resource-connector) defines on top of this
one. How an organization comes to have a resource installed is not decided yet.

## Create a resource

```sh
bunx jive-resource create jive-resource-example
```

That writes the package, adds `jive-abstract-resource` as a dev dependency, installs, and generates the
component's code, so the result builds as it stands. The target UX is `jive create resource`, which will
resolve this package; `jive create` is not built yet. Options: `--name <npm name>` (default: the directory's
name), `--component <identifier>` (default: the name without `jive-resource-`, camelCased, e.g.
`jive-resource-example-system` → `exampleSystem`), `--no-install` (only write the files).

## Package layout

```text
package.json                 the six jive:cicd:* scripts call `jive-resource cicd <hook>`
src/component/convex.config.ts   defineComponent("<name>", { env: { ... } })
src/component/schema.ts          the component's own tables
src/component/*.ts               its functions
src/component/_generated/        written by `bun run codegen`, committed
src/client/index.ts              optional typed wrapper, published as the package's main entry
example/convex/                  a Convex app installing the component with app.use: the usage example, and what audit pushes
convex.json                      {"functions": "example/convex"}
```

`src/component/_generated` is committed because Convex generates it by analysing the component on a running
backend. `bun run codegen` (`jive-resource codegen`) starts an anonymous deployment on a local backend that the
`convex` CLI downloads and runs itself, so it needs no Convex account; the same is true of `audit`.

### Environment variables

A component declares the variables it reads, and the installing app supplies them:

```ts
// src/component/convex.config.ts
export default defineComponent("example", { env: { API_TOKEN: v.string() } });

// the app's convex/convex.config.ts
app.use(example, { env: { API_TOKEN: app.env.EXAMPLE_API_TOKEN } });
```

Functions read them from `env` in `./_generated/server`. The example app passes values too, which is what makes
audit's push succeed.

## package.json

The fields every Jive package has (`jive.cicd` and the six hooks, from
[`jive-abstract-library`](https://github.com/jive-sh/jive-abstract-library)), with no block of this abstract's
own under `jive`: a resource's configuration is in `convex.config.ts`. Two further rules:

- `convex` is a peer dependency (the installing app's copy runs the component) and a dev dependency.
- `files`, `exports`, `repository`, `main`, `module` and `types` are banned: the build writes them.

`jive-resource dev` keeps `package.schema.json`, which `$schema` points at, current for the editor.

## The hooks

| Hook | What it does |
| --- | --- |
| `get-config` | Prints the validated `jive` block. |
| `build` | Emits `src/` with declarations into `dist/package/dist`, copies `src/` beside it, and writes the published manifest at `<version>-local`. Its `exports` are `./convex.config.js` and `./_generated/component.js` (types only), plus `.` when `src/client/index.ts` exists. An abstract with a contract also checks it here (below). |
| `audit` | Typechecks the package; regenerates `src/component/_generated` and fails if that changed a file; packs `dist/package`, installs the tarball into a copy of `example/convex` under `dist/audit-app`, and pushes that app to a local backend. The push is where Convex bundles the component, typechecks the app's calls and checks the app passes every required variable. |
| `deploy:plan` | Prints `{"deploy":false}` when the package's registry already lists the version the environment publishes (so a push without a version bump skips publishing), else a deploy to that version's npm page, e.g. `{"deploy":true,"url":"https://www.npmjs.com/package/<name>/v/1.2.0"}`. The check is jive-abstract-library's `planNpmRelease`. |
| `upload-artifacts` | Nothing. |
| `deploy` | Stamps the environment's version (`latest` → `X.Y.Z`, others prereleased, as `jive-abstract-library` releases) and the pipeline's repository onto the built manifest, and publishes it under the environment's dist-tag. Fails first if that version is already published. |

A package that needs more replaces one script and keeps the rest, e.g.
`"jive:cicd:audit": "jive-resource cicd audit && bun test"`.

## Resource kinds with a contract

A kind of resource, such as a package-registry connector, is an abstract extending this one (directly or through
another kind). It defines the functions every resource of that kind exposes as a type, and its CLI is this package's applied to its own definition:

```ts
// src/entrypoints/jive-resource-connector-package-registry.ts in jive-abstract-resource-connector-package-registry
import { Option } from "effect";
import { runResourceCli } from "jive-abstract-resource";

runResourceCli({
  cliName: "jive-resource-connector-package-registry",
  description: "…",
  abstractPackageName: "jive-abstract-resource-connector-package-registry",
  contract: Option.some({ componentApiType: "PackageRegistryComponentApi" }),
  scaffold: packageRegistryScaffold,
});
```

`build` then compiles a check that the component's generated `ComponentApi` has every function the contract
type names, with exactly its kind, arguments and return type, and fails naming each one that is missing or
differs. The contract is a type only, so the resource depends on its abstract only to build.

### The standard call: `resource.ensureInstance`

Every kind's contract includes one action, `resource.ensureInstance`: "make sure this instance exists" (design
page, decided 2026-11-01). It takes `{ instance, caller }`, plus `account` for a connector kind, and answers
`EnsureInstanceResult<Instance>`. This package exports both types:

| Answer | Meaning |
| --- | --- |
| `{ status: "ready", instanceId, instance }` | The instance exists and the caller may use it; `instanceId` is the component's id for it. |
| `{ status: "inProgress", retryAfterSeconds }` | Another caller is provisioning it; ask again later. |
| `{ status: "personNeeded", reason, url, resultUrl? }` | The outside system wants a person first. `url` is the page a person would open. `resultUrl`, when present, is where a program polls for what that page produces. |
| `{ status: "refused", reason }` | The caller may not have it; `reason` says what to change. |

- `instance` is the kind's declaration of one instance; for a package registry, `{ packageName }`.
- `caller` is a `ResourceCaller`: the code repository whose deploy job asks (`{ id, owner, name }`, where `id` is the
  installing app's id for it), plus the job's environment and workflow file.
- The component records each instance in its own tables, and binds it to the repository that first provisioned it.
- The installing app (`@jive-sh/server`'s `resources:provision`) calls `ensureInstance` on whichever implementation of
  the kind the caller's organization configured.

## Decisions

- **Resource packages are named by their extends path** (Alex, 2026-11-01): an abstract is
  `jive-abstract-resource-<kind path>` and an implementation `jive-resource-<kind path>-<system>`, e.g.
  `jive-abstract-resource-connector-package-registry` and `jive-resource-connector-package-registry-npm`.
- A resource is a Convex component published to npm, defining a kind of resource an organization owns; an app (the
  first is `@jive-sh/server`) installs it with `app.use`. This machinery was built on 2026-10-26 as
  `jive-abstract-connector` and moved here when the packages were renamed on 2026-11-01.

## Working on the test fixture

`test/fixture` depends on this package as `file:../..`, so each local fixture install copies the previous install's
`node_modules` into itself until `find`, `git status` and installs hang. Run
`rm -rf test/fixture/node_modules` before installing, and use `git status -uno` inside the fixture.

## Limitations

- `jive create resource` is not built: `jive create` does not resolve abstracts yet. Use `jive-resource create`.
- The local backend `codegen` and `audit` start has listened on port 3210 in every run so far; two runs at once
  on one machine have not been tried.
- Nothing here tests a component's functions against what it manages; a package adds its own tests to `audit`.
