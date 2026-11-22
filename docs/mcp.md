# Agent control and MCP

NOVA uses the official Model Context Protocol TypeScript SDK. Its tools manipulate the same strict project JSON used by the editor and renderer. No subscription, OpenAI API key, built-in model or internet connection is required for this local workflow. The agent itself is supplied by your chosen client.

## Local stdio: recommended

Start the application with `npm run dev`. From the repository root, `npm run mcp` starts the stdio server. Standard output contains only MCP messages; startup errors go to stderr. A client can launch it directly with absolute paths:

```json
{
  "mcpServers": {
    "nova": {
      "command": "node",
      "args": ["/absolute/path/to/nova/node_modules/tsx/dist/cli.mjs", "/absolute/path/to/nova/services/mcp-server/index.ts"]
    }
  }
}
```

Use the MCP configuration format required by your client. For Codex, add the same command and arguments under `[mcp_servers.nova]` in its MCP configuration. On Windows replace the two paths with your checkout paths. If the backend uses `NOVA_API_TOKEN`, pass the same token to the MCP subprocess environment through your client's secret mechanism. Do not commit tokens.

## Streamable HTTP

Set `NOVA_MCP_TOKEN` to a random token of at least 32 characters in the environment, then run `npm run mcp:http`. The stateless endpoint is `http://127.0.0.1:8002/mcp`. It accepts `Authorization: Bearer <token>` on POST requests, with standard MCP Accept headers (`application/json, text/event-stream`). GET/DELETE intentionally return 405; each request is stateless.

It binds to loopback only, rejects non-loopback Host headers and non-local Origin headers, accepts at most 12 MiB JSON, applies a 120 requests/minute limit, and uses bounded HTTP calls to the local application. The default token grants the listed tools. Set `NOVA_MCP_SCOPE=read` to expose only read-only tools; omitted or `full` permits editing/rendering. Project and scene deletion tools still require `confirm:true` and explicit user authorization. Audits record operation names and success/failure, never tokens or payloads.

This static bearer endpoint is for clients that support bearer authorization. NOVA does **not** currently implement an OAuth authorization server, OAuth discovery, public distribution, automatic public tunnels or multi-user authorization. Do not expose the raw editor, worker, asset service or database to the internet.

## Tool families

Project tools include `list_projects`, `create_project`, `get_project`, `update_project`, `duplicate_project`, `delete_project`, `get_project_schema`, `validate_project`, `import_project`, `export_project`, `get_project_versions` and `restore_project_version`.

Scene/layer tools include `list_scenes`, `get_scene`, `create_scene`, `update_scene`, `delete_scene`, `duplicate_scene`, `reorder_scenes`, `set_scene_duration`, `add_layer`, `update_layer` and `remove_layer`. Layer patches can edit transforms, typography, media references and motion. Camera and effect tools are `configure_camera`, `apply_visual_effect` and `configure_transition`.

Animation tools include `list_animation_presets`, `apply_animation`, `add_keyframe`, `update_keyframe` and `remove_keyframe`. All timing values are integer frames. Asset tools are `list_assets`, `get_asset`, `upload_asset`; MCP uploads are capped at 8 MiB decoded bytes, while larger uploads use the Studio. Filename, MIME and actual file signatures are checked by the asset service. Arbitrary filesystem paths, remote fetches and code execution are unsupported.

Creative tools include `list_templates`, `get_template`, `create_from_template`, `get_scene_catalog`, `get_effect_catalog`, `get_brand_profile` and `update_brand_profile`. System tools report actual worker health and supported formats. The machine-readable model is also available as `nova://schema/project`; `nova://docs/authoring` documents the editing contract.

Render tools are `render_frame`, `render_contact_sheet`, `render_preview`, `start_render`, `get_render_status`, `get_render_result`, `get_render_image`, `cancel_render`, `list_render_jobs`. All render requests return real background jobs; poll rather than blocking a tool call. Presets are `draft`, `instagram`, `high`, `4k`. A completed still/contact sheet can be retrieved using `get_render_image`, which returns actual MCP PNG image content for multimodal clients. Completed video results contain a local download URL, usable from the local Studio or a client with access to the local machine. JSON metadata alone is not proof that a visual has been inspected.

## Complete example workflow

1. Call `list_templates` and `get_project_schema`.
2. Call `create_from_template` with a returned template ID and a project name. Keep the returned project ID.
3. Call `get_project`; inspect scene and layer IDs before editing.
4. Call `update_scene` with `{projectId, sceneId, patch:{title:"A better website starts here",accent:"#2563EB"}}`.
5. Call `update_layer` for editable text or uploaded media, or `add_keyframe` with `{id:"scale-intro",frame:24,property:"scale",value:1.1,easing:"ease-out"}`.
6. Call `validate_project` with the full current project. Resolve warnings, missing assets and invalid timing.
7. Call `render_contact_sheet` with `{projectId}`. Poll `get_render_status` using its job ID until completed/failed/cancelled. Call `get_render_image` and actually inspect the result in a compatible visual client.
8. Correct issues, then call `render_preview`. Inspect the real draft video locally.
9. Obtain user approval for the final visual. Call `start_render` with `{projectId,preset:"instagram",format:"mp4"}`; poll and retrieve the completed output.

`export_project` returns canonical JSON with registered asset references; it is not a bundled binary asset archive. Unknown schema versions and executable/unknown fields are rejected. Uploaded media must be registered and added to the project's asset list before layers reference it.

## ChatGPT connection: verify your account

Checked November 21, 2026. Current [custom MCP instructions](https://developers.openai.com/api/docs/guides/custom-mcp-server) describe ChatGPT web → Plugins → plus → Add custom MCP server. Workspace permissions and security restrictions apply. Supported transports include SSE and Streamable HTTP. NOVA implements Streamable HTTP. Authentication must match what the target client supports; a bearer-only local endpoint is not automatically a compatible public ChatGPT app.

The [Help Center's plan-specific guidance](https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt-beta) describes full write-enabled MCP access for Business and Enterprise/Edu, with admin/role restrictions, and limited read/fetch access for Pro. Access is rolling out and documentation/UI may differ by account. Do not assume a personal account supports custom write-enabled tools. Check the actual account and current official guide before choosing this route.

OpenAI officially documents [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) for private servers. It requires a tunnel identity, a runtime API key and the relevant Platform tunnel permissions, separate from ChatGPT app permissions. NOVA does not install or start one. If available to your account, follow the current official tunnel-client quickstart, configure its local target as NOVA's stdio command above, keep the tunnel client running, and select that tunnel in ChatGPT's custom MCP connection flow. Tunnel association and app permissions still apply. Do not paste secret keys into project JSON or source control.

For an available tunnel-client installation, the documented stdio setup is:

```sh
tunnel-client init --sample sample_mcp_stdio_local --profile nova --tunnel-id YOUR_TUNNEL_ID --mcp-command "node /absolute/path/to/nova/node_modules/tsx/dist/cli.mjs /absolute/path/to/nova/services/mcp-server/index.ts"
tunnel-client doctor --profile nova --explain
tunnel-client run --profile nova
```

Supply the runtime key securely; replace the ID and paths. NOVA never runs these commands automatically.

If your account or client cannot use this route, local Codex stdio control and validated JSON import/export remain available. The video engine itself requires no paid AI API.

## Verified end-to-end run

On November 21, 2026 (local time), a real MCP SDK client connected to the real NOVA MCP server over linked MCP transports, with its API calls reaching the running Laravel service and its render calls reaching the running Remotion worker. This was separate from the mocked HTTP unit tests.

The client created a project from the Persian business template, persisted a 30-frame version, patched its scene/camera/accent, added an editable Persian text layer and two scale keyframes, validated with zero warnings, and queued a real MP4 plus frame 15 as PNG. Polling returned completed jobs. `get_render_image` returned native MCP `image/png` content, which was saved and visually inspected; the Persian headline and overlay were shaped and readable. The test project was archived afterward, not deleted.

FFprobe verified the actual video as 540 × 960, H.264, 30 FPS, with an AAC audio stream. The test confirms transport/API/edit/render/media-return integration; it is not a performance benchmark or a claim that every third-party MCP client supports video playback.

Artifacts:

- `examples/output/mcp-smoke.mp4` — actual one-second rendered video (119,425 bytes).
- `examples/output/mcp-smoke.png` — actual frame returned through MCP (608,538 bytes).
- `examples/mcp-smoke.project.json` — editable canonical project.
- `examples/output/mcp-verification.json` — real job IDs, source hash, FFprobe metadata, timestamps and operation list.

The persisted verification project ID is `fea28b23-c9b2-426b-8c63-5c425b08243e`; MP4 job `cca73ce7-1334-4ed8-89c2-993a24989dc1`; PNG job `d6a32125-f1a9-43a6-a953-04285dcf608c`.
