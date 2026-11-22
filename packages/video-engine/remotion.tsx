import React from "react";
import { Composition, registerRoot } from "remotion";
import { NovaComposition } from "./index";
import { createProject } from "../templates/index";
import { durationOf } from "../project-schema/index";
const project = createProject();
const Root = () => (
  <Composition
    id="Nova"
    component={NovaComposition}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={600}
    defaultProps={{
      project,
      assetBaseUrl: "http://127.0.0.1:8000",
      enable3D: true,
    }}
    calculateMetadata={({ props }) => ({
      width: props.project.width,
      height: props.project.height,
      fps: props.project.fps,
      durationInFrames: durationOf(props.project),
    })}
  />
);
registerRoot(Root);
