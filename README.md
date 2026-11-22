# NOVA Motion Studio

A working, local-first cinematic video workstation: React/TypeScript editor, Laravel/SQLite persistence, deterministic Remotion/Three.js compositions, a background render worker, and a real MCP server. Manual creation, importing, editing and rendering do not need an AI subscription.

## Run now

Requirements: Node.js24+, PHP8.4+ (8.5 tested), Composer2, Google Chrome/Chromium. Required PHP extensions include PDO SQLite, mbstring, fileinfo, zip, curl, DOM, GD and the normal Laravel requirements.

```bash
npm ci --legacy-peer-deps
npm run setup
npm run dev
```

Open **http://127.0.0.1:5173/**. Keep the startup terminal open. On this checkout, dependencies and the database have already been prepared: **`npm run dev` is enough**.

The single command launches or reuses the editor5173, Laravel8000 and renderer8001. All services bind to loopback. Stop launched services with Ctrl+C or `npm run stop`. Services started independently must be stopped in their own terminals.

Ubuntu: `bash scripts/setup.sh`. Windows PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/setup.ps1`, then `npm run dev`. Install PHP and Composer on PATH; enable `pdo_sqlite`, `sqlite3`, `mbstring`, `fileinfo`, `zip`, `curl`, `dom`, `gd` in php.ini. Windows instructions have been statically reviewed; this release was executed on Ubuntu, not Windows.

To use a built client, run `npm run build` followed by `npm start`. The local preview server proxies the same backend/worker paths. This is a personal workstation, not a public hosting deployment. No tunnel is installed.

Optional process settings are in `.env.example`; copy to `.env` to use Node's environment loader. Laravel has its own `apps/backend/.env`. Set `NOVA_CHROME_PATH` for a nonstandard Chrome install; Windows example: `C:/Program Files/Google/Chrome/Application/chrome.exe`. The renderer can otherwise use Remotion's compatible browser download on first export. Dependencies/fonts are local after installation; no internet is needed for core operation once a browser is installed.

## Use the studio

1. Open **Templates**, choose one of the12 presets, or create a project from **Projects**.
2. Choose a scene in the library or a clip in the timeline. Edit its title, colors, background, transition and camera in **Inspector**.
3. Add text, images, footage, audio, shapes or a self-contained, uncompressed GLB. Import files from **Assets**. Asset drag-and-drop onto the preview adds a timed layer.
4. Drag clips, trim their right edge, split with S, Shift-click to select multiple clips, or lock/hide/mute/solo tracks. Drag panel borders to resize the workspace. On smaller screens, use the inspector toggle.
5. Edit layer transforms and typography in Design; configure animation presets/keyframes in Motion. Time is stored as integer frames. Space plays; arrow keys step frames; Ctrl/Cmd+Z undoes; Ctrl/Cmd+S saves.
6. Click **Export** for a real MP4/WebM, still frame or contact sheet. The queue continues while editing. **Renders** shows actual worker progress/logs and allows cancellation/retry/download.
7. Projects autosave to local SQLite with revisions. **Project history** restores versions. **Settings → Workspace** exports a portable ZIP containing project data and registered assets. **Projects → Import** restores it.

The app shows save errors explicitly and retains an editor draft in browser storage. A server-side save is confirmed only after the API succeeds. Timeline keyframes, uploaded local fonts, RTL Persian content and real Three.js geometry are used by both Player and renderer.

## Agent integration

Start the app, then configure a compatible agent with this stdio command:

```json
{
  "mcpServers": {
    "nova": {
      "command": "npm",
      "args": ["run", "mcp", "--silent"],
      "cwd": "/absolute/path/to/motionix-studio"
    }
  }
}
```

The MCP server exposes54 tools for projects, scenes, layers, keyframes, templates, assets, camera settings, validated imports, rendering and system inspection. Actual rendered PNGs can be retrieved as MCP image content. Tool calls enqueue real jobs and return IDs for polling.

Use `npm run mcp:http` only after setting a strong `NOVA_MCP_TOKEN`. Read-only scope is available. HTTP is loopback-only and bearer-authenticated; OAuth discovery is not implemented. ChatGPT custom MCP access varies by plan/workspace and client requirements. See [MCP integration](docs/mcp.md) for official references, Secure MCP Tunnel information, limitations and the verified agent workflow. No public tunnel is started automatically.

For built-in direction, optionally configure an installed local Ollama model in **Settings → AI & connections**. A real disconnected/unavailable state is displayed. Proposed projects must pass the canonical schema before review/apply. The Ollama transport/security are tested with mocked model responses; actual model generation has not been run here. Other providers can use the external MCP/JSON workflow.

If you enable `NOVA_API_TOKEN`, set the same value for Node services and Laravel. Enter it in Settings → AI & connections → Local API access for the browser session. Do not commit tokens. Core default mode is a single-user loopback workstation, without mandatory authentication setup.

## Actual rendered examples

[Website commercial,20seconds](examples/output/website-commercial.mp4), [SaaS commercial,30seconds](examples/output/saas-product-commercial.mp4), [Persian reel,18seconds](examples/output/persian-business-reel.mp4).

The examples directory includes editable project JSON, actual thumbnails/contact sheets, original synthesized audio and FFprobe metadata. Main demos use540×960 at30FPS for a fast, reproducible draft. H.264/AAC exports are real media, not placeholders. Use an Instagram preset for1080×1920 output. `npm run demo:render` regenerates/imports examples through the running services. The MCP smoke example also contains an actual agent-created Persian MP4/PNG.

## Commands

- `npm run setup` — prepare PHP dependencies, app key, SQLite migrations.
- `npm run dev` / `npm start` / `npm run stop` — local development / built-client startup / stop tracked services.
- `npm run build` / `npm run typecheck` / `npm run lint` — build, strict types, formatting checks.
- `npm test` / `npm run test:backend` / `npm run test:e2e` — core/MCP, Laravel and browser tests.
- `npm run migrate` / `npm run health` — database migration and live service health.
- `npm run schema` — regenerate machine-readable JSON Schema.
- `npm run mcp` / `npm run mcp:http` / `npm run demo:render` — agent tools and demo production.

Browser tests require running services and Chrome; set `NOVA_CHROME_PATH` on other hosts. Font files ship under `public/fonts` with their OFL licenses. Remotion's upstream license has company-use conditions; review [Remotion licensing](https://www.remotion.dev/license) for your use case. No claim is made that all commercial organizations qualify for free use.

## Architecture and status

- `apps/studio` — responsive React editor, Zustand history, TanStack Query, accessible Radix dialogs/tooltips.
- `apps/backend` — Laravel13, SQLite, projects/revisions/assets/settings/brands/templates/audit, protected media access and ZIP backups.
- `packages/project-schema` — strict Zod model, semantic validation and frame editing operations; version1.
- `packages/video-engine` — shared deterministic2D/3D composition, motion interpolation, local typography/audio.
- `packages/templates` —12 distinct scene types and3 demo specifications.
- `services/render-worker` — real isolated Chromium/FFmpeg execution, serial job queue, on-disk journal and FFprobe checks.
- `services/mcp-server` — validated SDK tools, stdio/HTTP and read-only scope.

Laravel owns persistent domain data. The Node worker currently owns the render queue journal rather than a Laravel database queue; this is an explicit first-release tradeoff. GPU encoding is not claimed. Conservative frame workers default to2; jobs run one at a time. Hardware-specific performance has not been benchmarked on the requested RTX4060Ti.

Read [implementation checklist and remaining work](docs/IMPLEMENTATION.md), [verification evidence](docs/VERIFICATION.md), [backend/API guide](docs/backend.md), [schema/scene authoring](docs/AUTHORING.md), [upstream audit](docs/upstream-audit.md), and [ADRs](docs/adr).

This is a working release with explicit limits. Full nested scene editing, advanced Bézier handles, arbitrary material/light authoring, beat detection/ducking, Persian UI localization, hardware encoding, transparent/GIF/sequence export and remote OAuth remain unfinished. Some preset artwork is edited through local React source rather than as independent UI layers. No production security certification or Windows runtime claim is made.

## Troubleshooting

- **Page does not open:** from this folder, run `npm run dev`; use the printed5173URL. An occupied port fails clearly; don't expose the server publicly or change hosts to0.0.0.0.
- **Page opens but Save fails:** verify Laravel8000 and worker8001 are running. If API authentication is enabled, enter the token in Settings. The draft remains in your browser.
- **Upload says2MB:** use the root startup command. `php -d ... artisan serve` can lose upload settings in its spawned process; NOVA starts PHP directly with100MB limits.
- **Blank first frame:** scene entrance animations intentionally start from black. Press Play or scrub forward a second.
- **Render fails:** read the actual job log. Install Chrome/set `NOVA_CHROME_PATH`, verify required assets/fonts, reduce resolution or frame concurrency. Missing fonts fail explicitly.
- **GLB fails:** use a self-contained, uncompressed GLB with no remote resources. Draco/meshopt decoder downloads are disabled. WebGL failure has an explicit visual fallback.
- **Reset/recover:** export backups before changing local storage. Don't delete SQLite/assets blindly. Browser drafts and server revisions are independent recovery paths.
