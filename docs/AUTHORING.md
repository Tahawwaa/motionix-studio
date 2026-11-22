# Canonical projects and local scene authoring

`packages/project-schema/index.ts` is the source of truth. `npm run schema` generates `public/schema/project-v1.json`; MCP exposes the same structure as a resource and `get_project_schema`. Semantic checks such as unique IDs, track references, duration limits and layer containment run in Zod in addition to JSON Schema.

Schema version is1. Unknown/future versions are rejected; no historical v0/v2 migration is advertised. Export/import specifications through the Studio or MCP rather than editing SQLite directly.

A Project contains composition width/height/FPS, ordered-independent scenes, track metadata, registered asset references and a brand profile. Scenes carry absolute `startFrame`, positive `duration`, a registered scene type, editable copy, colors, effects, transition settings and camera path. Layers have scene-local frame timing, percent-based coordinates/dimensions, type/asset references, typography/audio properties and per-property keyframes. All times are integers. A layer must remain inside its containing scene.

Presets: website,saas,glass,product,mobile,tech,typography,education,before-after,brand,orbit,business. Use `createProject(id)` and `createScene(type,startFrame,duration)` from `packages/templates` to obtain valid defaults. `makeLayer(type,trackId,duration)` creates a valid layer. Use `uid()` for new IDs. User text is ordinary editable Unicode; use Vazirmatn/RTL for Persian. Never separate Persian characters into individually positioned spans: preserve shaping using full text masks or word groups.

Animation presets: none,fade,slide,scale,spring,stagger,typewriter,float,orbit,mask,perspective,parallax,elastic. Keyframe properties: x,y,scale,rotation,opacity,blur,fontSize,volume and model-layer camera coordinates. Available easing modes are linear,ease-in,ease-out,ease-in-out,spring. The graph plots values; interactive cubic Bézier handles are not implemented. Camera paths are orbit,dolly-in,dolly-out,truck,crane,static; PBR3D presets implement actual camera position changes. Flat2D preset artwork uses frame-driven CSS perspective; it is not misrepresented as ray-traced3D.

Effects are composable frame-derived approximations: vignette,seeded grain,particles,scanlines,light sweep,chromatic type shadow/bloom approximation,glass. Not every film effect in the master brief has a complete optical simulation. Only expose a new effect in the schema/catalog when its renderer exists.

For uploaded fonts, include the registered font Asset in `project.assets` and choose `fontFamily:'asset:<asset-id>'`. The engine loads only registered local font URLs. Missing required fonts fail the render. Portable backups remap both media and font references on restore.

Asset paths accept only `/storage/assets/<safe-id>.<extension>`. Remote URLs, executable code, arbitrary CSS, filesystem paths and shell commands do not belong in project JSON. Uploaded image layers can also map the original image onto supported browser/device artwork. GLB import requires self-contained, uncompressed files; remote decoders/resources are not fetched.

To extend the trusted local library, add a deterministic React scene component in `packages/video-engine/index.tsx`, register its type in the canonical schema and templates, and add an engine test plus a real frame export. Use `useCurrentFrame`, `spring`, seeded values and frame-derived transforms. Don't use browser wall time, uncontrolled animation timers or `Math.random()` in rendered content. Imported JSON and remote agents cannot install or execute scene code.

Preview and renderer both import `NovaComposition`. Render-only options supply the registered asset origin; they do not use a separate composition. `packages/video-engine/remotion.tsx` provides composition metadata. Visual QA is performed by an actual inspecting agent/user; contact-sheet generation alone is not automated visual review.
