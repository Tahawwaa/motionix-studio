# ADR 0001 — A canonical frame-based scene project

Status: accepted. Date: 2026-11-21.

NOVA needs independent tracks, typed editable layers, scene-local animation, asset references, RTL content and deterministic export. Abekyo's sequential second-duration clip model cannot represent that domain without changing every consumer.

Use `packages/project-schema` as the single strict Zod model. Store scene starts, durations, clip trims and keyframes as integer frames. Scene starts are absolute; layers are relative to their containing scene; keyframes are layer-local. Preview, export, MCP and backend validation consume the same canonical JSON. Zod emits the machine-readable JSON Schema for agents. No executable strings, arbitrary URLs or unknown keys are accepted.

Consequences: existing Abekyo project JSON is not silently accepted as NOVA JSON; importing legacy data needs an explicit future converter. The renderer and editor share `NovaComposition`, eliminating separate animation implementations. Projects explicitly declare schemaVersion 1. Unsupported future schema versions fail safely rather than being guessed at.
