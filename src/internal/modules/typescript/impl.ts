import { implementing, type EffectGen } from "effective-modules";
import { resourceModules } from "../index";
import type { ITypeScript } from "./interface";

export class TypeScriptImpl extends implementing(resourceModules.TypeScript)
  .uses(resourceModules.Process)
  implements ITypeScript {
  *compile(input: { readonly project: string; readonly purpose: string }): EffectGen<void, string> {
    yield* this.dependencies.Process.run({
      command: "bunx",
      args: ["tsc", "--pretty", "-p", input.project],
      cwd: ".",
      env: {},
      purpose: input.purpose,
    });
  }
}
