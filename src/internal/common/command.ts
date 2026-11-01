import { makeCicdCommandFactory, type CicdCommandFactory } from "jive-abstract-library";
import type { ResourceModules } from "../modules";
import { layerLive } from "./layer";

export const { makeCicdCommand, makePipelineCommand, makeDeployCommand, makeDeployPlanCommand }: CicdCommandFactory<ResourceModules> =
  makeCicdCommandFactory(layerLive);
