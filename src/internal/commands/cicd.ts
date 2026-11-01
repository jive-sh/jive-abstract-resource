import { Command } from "commander";
import { Effect, Option, Schema } from "effect";
import { makeCicdCommand, makeDeployCommand, makeDeployPlanCommand, makePipelineCommand } from "../common/command";
import { resourceModules } from "../modules";
import type { ResourceAbstract } from "../public/abstract";
import { JivePackageConfig } from "../public/manifest";

/** The six hooks Jive's reusable pipeline calls; only `build` differs between resource kinds, by the contract it checks. */
export function cicdCommand(abstract: ResourceAbstract): Command {
  const getConfig = makeCicdCommand(
    "get-config",
    "print this package's validated jive config as JSON for the pipeline's context job",
    function* () {
      const { jive } = yield* (yield* resourceModules.Package).load();
      process.stdout.write(`${JSON.stringify(Schema.encodeUnknownSync(JivePackageConfig)(jive))}\n`);
    },
  );

  const build = makeCicdCommand(
    "build",
    Option.match(abstract.contract, {
      onNone: () => "emit the component into dist/package with the manifest an installing app needs",
      onSome: ({ componentApiType }) => `emit the component into dist/package, and check it implements ${componentApiType}`,
    }),
    function* () {
      const packageJson = yield* (yield* resourceModules.Package).load();
      yield* (yield* resourceModules.ComponentPackage).build(packageJson);
      if (Option.isSome(abstract.contract)) {
        yield* (yield* resourceModules.Contract).check({
          contract: abstract.contract.value,
          abstractPackageName: abstract.abstractPackageName,
        });
      }
      yield* Effect.log("Build complete");
    },
  );

  const audit = makeCicdCommand(
    "audit",
    "typecheck the package, check the committed generated code is current, and push the example app with the built package installed to a local Convex backend",
    function* () {
      const packageJson = yield* (yield* resourceModules.Package).load();
      yield* (yield* resourceModules.TypeScript).compile({ project: "tsconfig.json", purpose: "typecheck the package" });
      yield* (yield* resourceModules.ComponentPackage).checkGeneratedCodeCurrent();
      yield* (yield* resourceModules.ExampleApp).pushWithBuiltPackage(packageJson);
      yield* Effect.log("Audit complete");
    },
  );

  const deployPlan = makeDeployPlanCommand(
    "deploy-plan",
    "print whether this environment has a version to publish and, if so, its npm page",
    function* (input) {
      const packageJson = yield* (yield* resourceModules.Package).load();
      return yield* (yield* resourceModules.Release).plan({ packageJson, ...input });
    },
  );

  const uploadArtifacts = makePipelineCommand(
    "upload-artifacts",
    "no-op: the package is published in deploy, per environment",
    function* (context) {
      yield* Effect.log(`Nothing to upload for ${context.repository.owner}/${context.repository.name}`);
    },
  );

  const deploy = makeDeployCommand(
    "deploy",
    "publish the built package to npm under this environment's version and dist-tag",
    function* (input) {
      const packageJson = yield* (yield* resourceModules.Package).load();
      yield* (yield* resourceModules.Release).publish({ packageJson, ...input });
    },
  );

  const cicd = new Command("cicd").summary("hooks invoked by Jive's reusable CI/CD pipeline");
  [getConfig, build, audit, deployPlan, uploadArtifacts, deploy].forEach((command) => { cicd.addCommand(command); });
  return cicd;
}
