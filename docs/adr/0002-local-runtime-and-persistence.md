# ADR 0002 — Separate the workstation, persistence and rendering process

Status: accepted. Date: 2026-11-21.

The workspace was empty. Server rendering in Next.js would not remove the need for durable domain management or a background rendering queue. A single-page creative workstation does not require server rendering for discovery or SEO.

Use a strict React/TypeScript Vite client, Laravel with local SQLite for domain persistence, and a Node/Remotion process for rendering. Laravel provides project revisions, registered assets, brands, settings and activity. Node owns browser/FFmpeg resource limits and real export execution. Service bindings default to loopback. Use one active video export by default and conservative per-render concurrency. The app requires no cloud service or LLM provider for manual or agent-driven editing and rendering.

Consequences: native development has three local processes, coordinated by the root start script. PHP never reimplements frame rendering. The MCP service is an optional fourth process acting through validated APIs; it cannot browse the filesystem or execute code. SQLite is the default; remote hosting and multi-user tenancy are deliberately outside the current scope.
