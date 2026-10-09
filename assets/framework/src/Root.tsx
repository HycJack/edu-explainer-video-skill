import React from "react";
import { Composition, Folder } from "remotion";
import { ProofVideo } from "./framework/ProofVideo";
import { getContent } from "./framework/registry";
import { filmFrames } from "./framework/compile";
import { FPS, TOTAL } from "./registry-meta";

/**
 * One composition component, many problems. A new problem is a content file
 * plus one <Composition> that names its id — no component, no frame maths.
 *
 * `filmFrames` counts the statement and outro cards too: <Series> opens on the
 * statement and closes on the outro, so timing the Composition to the steps
 * alone would clip both cards.
 */
const entries = [
  { id: "cuboid-perpendicular", title: "长方体中的垂直与平行" },
  { id: "conic-chord", title: "椭圆上定过点弦长的最值" },
  { id: "circle-incenter", title: "内心、延长线与 DB = DE" },
];

export const RemotionRoot: React.FC = () => (
  <>
    {entries.map((e) => {
      const content = getContent(e.id);
      return (
        <Composition
          key={e.id}
          id={e.id}
          component={ProofVideo}
          width={1920}
          height={1080}
          fps={FPS}
          durationInFrames={filmFrames(content, FPS)}
          defaultProps={{ contentId: e.id }}
        />
      );
    })}
    <Folder name="Meta">
      <Composition
        id="registry"
        component={ProofVideo}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={TOTAL}
        defaultProps={{ contentId: "cuboid-perpendicular" }}
      />
    </Folder>
  </>
);
