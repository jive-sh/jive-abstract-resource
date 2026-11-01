import { Command } from "commander";
import { cicdCommand } from "../commands/cicd";
import { codegen } from "../commands/codegen";
import { createCommand } from "../commands/create";
import { dev } from "../commands/dev";
import type { ResourceAbstract } from "./abstract";

/**
 * The CLI of a resource kind: the six hooks, `create`, `codegen` and `dev`. `jive-resource` is this applied to
 * `resourceAbstract`; an abstract extending this one calls it with its own definition from its own entrypoint.
 */
export function makeResourceCli(abstract: ResourceAbstract): Command {
  return new Command(abstract.cliName)
    .description(abstract.description)
    .addCommand(cicdCommand(abstract))
    .addCommand(createCommand(abstract))
    .addCommand(codegen)
    .addCommand(dev);
}

/** Parses the process's arguments with the kind's CLI; the body of an abstract's entrypoint. */
export function runResourceCli(abstract: ResourceAbstract): void {
  const program = makeResourceCli(abstract);
  program.parse();
  if (process.argv.length <= 2) program.help();
}
