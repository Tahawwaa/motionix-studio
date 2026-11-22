# ADR 0003 — Constrain agent operations to data

Status: accepted. Date: 2026-11-21.

External prompts and imported metadata are untrusted. A motion graphics engine must not turn arbitrary JSON strings into JavaScript, shell commands, URL fetches or filesystem paths.

Expose typed project/scene/layer/animation/render operations through the official MCP SDK. Local developer agents use stdio. Streamable HTTP binds only to 127.0.0.1, requires a long bearer token, rejects untrusted Host/Origin headers, limits body size and request rate, and uses bounded service timeouts. Registered asset paths are the only media references. Tools return errors rather than simulate a provider or renderer. Destructive deletion requires an explicit confirmation argument.

A developer may add trusted React scene components by editing source locally and restarting/rebuilding; remote clients cannot author or evaluate source through MCP. A public tunnel is never created automatically. ChatGPT integration depends on the account, client, workspace permissions and current supported authentication; stdio and canonical JSON remain complete local alternatives.

Consequences: conventional programmatic animation is never labeled as generative video synthesis. Unsupported project properties are rejected instead of ignored. Bearer HTTP is intended for compatible clients; this service does not implement OAuth discovery and must not be advertised as a turnkey publicly distributable ChatGPT plugin.
