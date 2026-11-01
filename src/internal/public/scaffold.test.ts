import { describe, expect, test } from "bun:test";
import { Schema } from "effect";
import { resourceAbstract } from "./resource";
import { PackageJsonSchema } from "./manifest";
import { commonScaffoldFiles, defaultComponentName } from "./scaffold";

describe("defaultComponentName", () => {
  test("drops the scope and the jive-resource- prefix, then camelCases", () => {
    expect(defaultComponentName("jive-resource-connector-package-registry-npm")).toBe("connectorPackageRegistryNpm");
    expect(defaultComponentName("@acme/jive-resource-slack")).toBe("slack");
    expect(defaultComponentName("my_resource.v2")).toBe("myResourceV2");
  });

  test("gives nothing when the result is not an identifier", () => {
    expect(defaultComponentName("jive-resource-2fa")).toBeUndefined();
  });
});

test("the scaffolded package.json satisfies the schema the hooks decode it with", () => {
  const files = commonScaffoldFiles(resourceAbstract, { packageName: "jive-resource-example", componentName: "example" });
  const decoded = Schema.decodeUnknownSync(PackageJsonSchema)(JSON.parse(files["package.json"]!));
  expect(decoded.scripts["jive:cicd:audit"]).toBe("jive-resource cicd audit");
});

test("the schema refuses a manifest without convex as a peer dependency, or with fields the build generates", () => {
  const files = commonScaffoldFiles(resourceAbstract, { packageName: "jive-resource-example", componentName: "example" });
  const packageJson = JSON.parse(files["package.json"]!);
  expect(() => Schema.decodeUnknownSync(PackageJsonSchema)({ ...packageJson, peerDependencies: {} }))
    .toThrow(`"convex" must be in peerDependencies`);
  expect(() => Schema.decodeUnknownSync(PackageJsonSchema)({ ...packageJson, exports: { ".": "./x.js" } })).toThrow();
});
