import { Effect, FileSystem, pipe } from "effect";
import { implementing, type EffectGen } from "effective-modules";
import { dirname, join } from "node:path";
import { commonScaffoldFiles } from "../../public/scaffold";
import { resourceModules } from "../index";
import type { CreateInput, IScaffold } from "./interface";

export class ScaffoldImpl extends implementing(resourceModules.Scaffold)
  .uses(FileSystem.FileSystem, resourceModules.Process, resourceModules.ConvexCli)
  implements IScaffold {
  *create({ abstract, directory, scaffold, install }: CreateInput): EffectGen<ReadonlyArray<string>, string> {
    const fs = this.getDependency(FileSystem.FileSystem);
    const fsOp = <A>(operation: Effect.Effect<A, { readonly message: string }>) => pipe(operation, Effect.mapError((e) => e.message));

    if (yield* fsOp(fs.exists(directory))) {
      if ((yield* fsOp(fs.readDirectory(directory))).length > 0) {
        return yield* Effect.fail(`${directory} already exists and is not empty`);
      }
    }

    const files = { ...commonScaffoldFiles(abstract, scaffold), ...abstract.scaffold(scaffold) };
    for (const [path, text] of Object.entries(files)) {
      yield* fsOp(fs.makeDirectory(dirname(join(directory, path)), { recursive: true }));
      yield* fsOp(fs.writeFileString(join(directory, path), text));
    }
    yield* Effect.log(`Created ${scaffold.packageName} (component ${scaffold.componentName}) in ${directory}`);

    if (install) {
      yield* this.dependencies.Process.run({
        command: "bun",
        args: ["add", "--dev", abstract.abstractPackageName],
        cwd: directory,
        env: {},
        purpose: `install ${abstract.abstractPackageName} and the new package's other dependencies`,
      });
      yield* this.dependencies.ConvexCli.codegenComponent(directory);
    }
    return Object.keys(files).sort();
  }
}
