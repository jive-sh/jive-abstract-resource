import { Option } from "effect";
import type { ResourceAbstract } from "./abstract";
import { resourceScaffold } from "./scaffold";

/** This abstract's own kind: a resource with no contract beyond being an installable Convex component. */
export const resourceAbstract: ResourceAbstract = {
  cliName: "jive-resource",
  description: "scaffold, build, audit and publish a Jive resource: a Convex component defining a kind of resource an organization owns",
  abstractPackageName: "jive-abstract-resource",
  contract: Option.none(),
  scaffold: resourceScaffold,
};
