import { Effect, FileSystem, pipe } from "effect";
import { implementing, type EffectGen } from "effective-modules";
import { loadPackageJson } from "jive-abstract-library";
import { PackageJsonSchema, type PackageJson } from "../../public/manifest";
import { resourceModules } from "../index";
import type { IPackage } from "./interface";

export class PackageImpl extends implementing(resourceModules.Package).uses(FileSystem.FileSystem) implements IPackage {
  *load(): EffectGen<PackageJson, string> {
    return yield* pipe(
      loadPackageJson(PackageJsonSchema),
      Effect.provideService(FileSystem.FileSystem, this.getDependency(FileSystem.FileSystem)),
    );
  }
}
