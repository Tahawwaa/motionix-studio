# Abekyo foundation audit

Audited the actual source of [abekyo/abekyo-editor](https://github.com/abekyo/abekyo-editor), commit `d4428949cacb5d119c39c264ce811f1bcf61cb10`, on November 21, 2026. The checkout was inspected outside this project; it is not a hidden runtime dependency.

## Architecture and license

Abekyo uses Next.js 16 App Router, React 19, Zustand, next-intl and Remotion 4. Its MIT license is copyright 2026 Opportunity Inc. Its schema models a sequential list of image/video clips plus subtitle overlays and background music. Client state separates project data from transient selection/history. The same cumulative-boundary frame math feeds composition length, timeline and preview, a good pattern retained conceptually in NOVA's canonical integer-frame model.

The rendering route validates JSON, resolves media, caches a Remotion bundle and streams real NDJSON render progress. It supports cancellation on client disconnect, concurrent render caps, H.264 output, and configurable upload retention. Remotion and third-party licenses remain independent of the upstream MIT license.

## Existing capability and tests

The editor supports sequential clips, trims, split, reordering, subtitle positioning, narration and BGM editing, keyboard shortcuts and undo/redo. Existing transitions, image effects and React compositions are suitable for its linear narration workflow. There is no independent arbitrary track/layer hierarchy or frame-driven 3D scene registry. The published project schema is permissive (`additionalProperties: true`) and stores durations in seconds. Narration uses a fixed 1.2× playback speed, which is not appropriate as a default for general motion graphics.

API routes are `/api/upload`, `/api/render`, and `/api/project/validate`. A zero-dependency hand-written stdio MCP server exposes validate/upload/render-oriented operations; it is not a persistent project/scene management service. Projects and music-library state depend on browser state rather than durable domain entities, server project revisions, export history or a background job database.

The checkout contains 24 test files (unit, route integration and React components), including project validation, upload magic bytes, rate limiting, frame layout, audio offsets, drag sessions and stores. Its CI declares 108 cases and runs typecheck, tests, locale parity, build and lint. This audit inspected those tests and workflow; it does **not** claim the upstream suite was executed. The workflow tolerates a documented lint warning ceiling of 94. Runtime dependencies generally use caret ranges, except React/React DOM; its lockfile does constrain resolutions.

## Security and extensibility

The source has meaningful structural/resource validation, media-origin policy, signature-based upload detection, rate limiting, concurrency reservation before awaits and error redaction. It explicitly ships no authentication and writes media to public upload folders. Rendering is tied to a long-lived HTTP request rather than a resumable persisted queue. There is no built-in remote MCP authentication or project authorization model. A single recent checkout, one visible branch and no published releases do not establish a long maintenance history; suitability was judged from code, not popularity.

The media origin is derived from configuration instead of incoming Host headers, a useful security decision. Its absolute URL policy compares hostnames rather than full origins, which makes a narrower registered-asset model preferable for NOVA. The editor is extensible through React compositions and presets, but its linear clip model would require adapters throughout the editor, API and renderer to support NOVA's independent tracks, scenes and layers.

## Decision

Build a clean frame-based domain core while retaining the proven architectural concepts: one project model, shared preview/export composition, bundle caching, real renderer progress, cancel signals, strict asset classification and targeted tests. Do not copy an entire editor whose state and timing semantics would then need replacement. Use Vite for the workstation client, Laravel/SQLite for persistent projects/assets/revisions/settings/activity and a dedicated Node rendering service. See the ADRs. No upstream source code is bundled in this implementation, so no upstream license is rebranded as NOVA's own work.
