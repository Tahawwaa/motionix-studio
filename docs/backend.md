# Local Laravel backend

NOVA uses Laravel 13.43.0, SQLite, Eloquent and private local storage. PHP 8.5.4 and PDO SQLite were used for verification. Exact PHP package versions and the Composer lockfile are included. No account, subscription, external database or cloud storage is required.

## Start and setup

From the repository root:

```sh
composer install --working-dir=apps/backend
cp apps/backend/.env.example apps/backend/.env
php apps/backend/artisan key:generate
php apps/backend/artisan migrate --force
cd apps/backend
php -d upload_max_filesize=100M -d post_max_size=105M -S 127.0.0.1:8000 -t public public/index.php
```

SQLite is at `apps/backend/database/database.sqlite`; create an empty file there before the first migration if it does not exist. `npm run setup` automates the project setup. The render worker at port 8001 must be available for project writes, restores and JSON template writes, because it applies the exact shared Zod project schema. Backend tests mock that boundary and do not require a running worker.

## API contract

All endpoints return JSON except asset streams and ZIP backup downloads. Collections are plain arrays, projects are complete canonical project documents. Errors use normal HTTP status codes and JSON messages.

- `GET /api/health`: database liveness.
- `GET /api/projects`, `POST /api/projects`: list complete projects or create one from a canonical project document.
- `GET /api/projects/{id}`, `PUT /api/projects/{id}`: reopen or save a complete project.
- `DELETE /api/projects/{id}`: requires JSON `{"confirm":true}`. Archive by saving the project's `archived` flag.
- `GET /api/projects/{id}/versions`: revision metadata, newest first.
- `GET /api/projects/{id}/versions/{version}`: complete historical document.
- `POST /api/projects/{id}/versions/{version}/restore`: validates a historical document, restores it, and creates a new revision.
- `GET /api/projects/{id}/backup`: portable ZIP containing `project.json` and referenced local assets.
- `POST /api/projects/import-backup`: multipart `file`, returns an independently restored project with newly generated project and asset IDs. Existing projects are preserved.
- `GET /api/assets`, `GET /api/assets/{id}`: asset metadata.
- `POST /api/assets`: multipart `file`, maximum 100 MB. Original filenames never become filesystem paths.
- `PATCH /api/assets/{id}`: change `name`, `tags`, `folder` metadata.
- `DELETE /api/assets/{id}`: requires `confirm:true` and rejects assets referenced by a current project.
- `GET /storage/assets/{generated-filename}`: validated media stream, including byte ranges for browser playback.
- `GET /api/settings`, `PUT /api/settings`: persistent validated workstation preferences.
- `GET /api/brands`, `POST /api/brands`, `PUT /api/brands/{id}`: persistent brand profiles.
- `GET /api/templates`, `POST /api/templates`: saved user templates; POST accepts `{project: canonicalProject}`. Built-in templates are provided by the shared template package.
- `GET /api/activity`, `POST /api/activity`: bounded audit metadata; POST `{action,subject?,details?}`. Secret-named keys are redacted recursively.
- `GET /api/storage`: asset usage and available disk space.
- `GET /api/director/status`: actual configured provider state.
- `POST /api/director`: `{prompt,project}` returns a schema-validated draft `{project,provider,message}` without saving or rendering it.

## Director

The built-in provider supports a locally installed Ollama model. Configure `provider: "ollama"`, `providerModel` to an installed model name and `providerUrl: "http://127.0.0.1:11434"` through settings. `localhost:11434` is also accepted. Only that loopback port is permitted; redirects, userinfo, alternative paths and query strings are blocked. Status queries read real `/api/tags` data. Generation supplies the canonical JSON schema to `/api/chat`, validates the result again, preserves the original asset library and refuses missing asset references. The request has a 120-second limit and an 8 MB response ceiling.

No Ollama model is bundled or downloaded automatically. Provider generation was verified with mocked HTTP integration tests; actual local model quality and performance require a separately installed model. A configured `openai-compatible` provider reports unavailable in this built-in adapter; use MCP with an external agent for other providers.

## Security and storage

The application accepts only loopback client addresses and `localhost`/`127.0.0.1` Host headers. It ignores forwarded client-IP claims. API browser origins are restricted to the local editor and API ports; cross-site API fetches are blocked. Media GET/HEAD streams allow CORS from arbitrary loopback ports for Remotion’s temporary local bundle server, while rejecting non-loopback origins. APIs are rate-limited, with separate upload, backup and Director buckets. Optional `NOVA_API_TOKEN` requires bearer authentication on `/api/*`; configure the same token in each client. Storage media remains loopback-only and exempt from bearer checks so Chromium can read it during deterministic rendering.

Assets live under `storage/app/private/assets` with generated UUID filenames; there is no public-storage symlink and Laravel temporary raw-storage routes are disabled. File type is determined from magic bytes, with actual image dimensions validated and capped at 64 megapixels. SVG active elements, event handlers and external references are rejected. GLB files must be valid version-2 containers, self-contained and uncompressed; external URI references and Draco/meshopt decoder dependencies are blocked. Video/audio container signatures are checked at upload; complete decode integrity is established by rendering, not by the upload signature check. WOFF2 font containers can be stored and referenced by text layers through the canonical `asset:<font-id>` font-family form. Brand profile fonts currently use the four built-in font presets.

Backup imports never extract archive paths. Entry count, uncompressed size, names and symlinks are checked before generated temporary files are used. Imported asset bytes pass the same upload validator. Failed imports roll back database writes and clean files created during the attempt. Backups require all referenced asset files to exist. For a full workstation backup, also copy the SQLite database and private asset directory while the services are stopped. Revision history and saved templates are not included in a single-project portable archive.

Project updates, revision snapshots and audit entries are transactional. The renderer worker owns its background rendering process and queue; Laravel does not encode video. The initial `render_records` table reserves metadata storage for future orchestration integration; worker queue files currently own actual render state.

## Tests

```sh
cd apps/backend
php artisan test --compact
vendor/bin/pint --dirty --format agent
```

Tests cover Persian project persistence, revisions, restoration, canonical-validation rejection and outages, generated asset paths, spoofed content, asset streaming, loopback/origin/Host/token boundaries, settings limits, brand persistence, secret redaction, portable asset restoration, archive traversal/count/corruption, import rollback, external GLB blocking, active SVG blocking, disconnected Director behavior, provider SSRF restrictions and validated local-model output. These are local integration tests; no live model call or public remote deployment is claimed.

## Live backup verification

On November 21, 2026 (America/Chicago), the saved **03 — Persian Business Reel** was downloaded through the running Laravel API as a 593,552-byte ZIP, restored through the multipart import endpoint, and validated against the running canonical-schema worker. All editable Persian scene titles were preserved. Project and asset IDs changed, every audio-layer reference resolved to the new asset ID, and the restored audio stream was readable. Its 1,323,044 bytes matched the source SHA-256 `7f58354498f0426bd0a4dae79d18bbf5927a3ab9d7545d6d6652732ece904b13`.

The original demo was preserved. The restored verification project was saved as archived. Runtime verification details are in `.nova/backup-roundtrip-result.json`; the tested archive is at `/tmp/nova-backup-verified.zip` on this installation. These files are local verification outputs, not dependencies of the application. The backend automated suite currently passes **29 tests with 117 assertions**, including uploaded-font reference remapping and canonical hex-color lengths.
