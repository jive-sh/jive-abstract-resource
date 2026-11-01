/**
 * The public surface of this abstract. A resource package reaches the hooks through the `jive-resource` CLI;
 * what is exported here is for abstracts extending this one (a resource kind with a contract): the CLI built
 * from a kind's definition, the types of the standard call every kind's contract includes, the scaffold pieces to
 * compose, and the package.json schema.
 */
export type { ResourceAbstract, ResourceContract, ScaffoldFiles, ScaffoldInput } from "./internal/public/abstract";
export type { EnsureInstanceResult, ResourceCaller } from "./internal/public/instance";
export { makeResourceCli, runResourceCli } from "./internal/public/cli";
export { resourceAbstract } from "./internal/public/resource";
export { GENERATED_FIELDS, JivePackageConfig, PackageJsonSchema, type PackageJson } from "./internal/public/manifest";
export {
  commonScaffoldFiles,
  componentConfigSource,
  resourceScaffold,
  defaultComponentName,
  exampleAppConfigSource,
} from "./internal/public/scaffold";
