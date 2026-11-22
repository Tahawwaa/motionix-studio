# Implementation checklist

This is a working local release, not a claim that every item in the original master brief is complete. Evidence is recorded in `docs/VERIFICATION.md`.

- [x] Audit Abekyo source, MIT license, schema, security and tests; record decisions.
- [x] Strict shared schema, integer frame timeline, safe imported project specifications.
- [x] Shared deterministic Remotion composition for live preview, stills and exports.
- [x] Twelve distinct scene presets; genuine Three.js PBR scenes and camera paths.
- [x] Studio, projects, templates, assets, render center, preferences and brand profiles.
- [x] Frame scrubbing, independent scene/layer tracks, trim, split, snapping, ripple, multi-selection, lock/hide, mute/solo, zoom, undo/redo and clipboard.
- [x] Property/keyframe editing; interpolation presets; keyframe value graph.
- [x] Local Laravel/SQLite persistence, revision restore, secure asset uploads, ZIP project backups.
- [x] Real background rendering, queue persistence, measured progress, cancellation, retry, FFprobe output validation.
- [x] MCP stdio/authenticated HTTP, schema resources, validated editing and rendering tools, audit trail.
- [x] Real end-to-end agent-created Persian video and native MCP image inspection.
- [x] English/Persian shaping, local licensed fonts, uploaded fonts, frame-based typography.
- [x] Optional local Ollama adapter; disconnected state is explicit. Transport tested with mocks; no installed model used.
- [x] Real 20s website, 30s SaaS, 18s Persian MP4s with original audio, stills and contact sheets.
- [x] Typecheck, production build, unit/integration tests, backend tests and real browser tests.
- [ ] Full feature parity with a professional NLE: nested scenes, leading-edge trim/slip/roll, track-to-track drop, comprehensive group editing and full curve control handles.
- [ ] Full scene-graph hierarchy, custom lights/material inspector, arbitrary camera keyframes on all preset scenes, blend modes and layer masks.
- [x] Real decoded audio waveform preview for imported audio up to25MB.
- [ ] Beat tools, automatic beat detection, ducking and normalization UI.
- [ ] Full Persian UI localization and Persian digit formatting (Persian video content works).
- [ ] Arbitrary OpenAI-compatible remote providers and OAuth discovery for ChatGPT HTTP MCP.
- [ ] Hardware encoding verification, memory enforcement, proxy generation and advanced disk/cache management.
- [ ] Image sequence/GIF/transparent video export.
- [ ] Windows11 execution validation and GPU-specific benchmarking.
- [ ] Production penetration test, authenticated remote deployment and multi-user mode.

## Scope of the motion system

Scenes have editable headlines, subtitles, accent/background, timing, camera paths and effects. User-added text/image/video/audio/shape/model layers have independent timing, transforms and keyframes. Preset-internal browser/dashboard drawings are authored React components, not a free-form After Effects scene graph. Change their internals in the trusted local scene authoring workflow.

The graph view plots keyframes. It does not yet offer draggable cubic Bézier handles. Animations and available transitions are frame-driven approximations with explicit parameters. A CSS glow is not represented as a physically simulated optical bloom.

The Laravel API owns persistent domain data. Rendering remains an isolated Node queue with an on-disk journal; it is not implemented as a Laravel database queue. This deliberate first-release boundary is documented in the ADRs. The worker binds only to loopback.
