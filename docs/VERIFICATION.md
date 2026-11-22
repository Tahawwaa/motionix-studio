# Verified behavior — 2026-11-21

This report distinguishes executed checks from intended capabilities.

- Strict TypeScript and Vite production build passed on the implemented application.
- Initial complete Vitest run:34 passing core/engine/MCP tests. After uploaded-font/concurrency and selection/lock work, the focused core/engine suite passed25 tests. MCP's12 earlier tests include actual SDK exchanges and authenticated temporary HTTP transport, not only stub dispatch.
- Laravel suite:29 tests,117 assertions passed. Covers persistence/revisions, whitespace/Persian preservation, upload signature protection, origins/loopback/tokens, archive safety, brand validation, font remapping and portable backup security.
- Browser suite: the template/timeline, disconnected-Director rejection and realPNG export/download checks passed. An inspector-label issue initially failed text/mobile tests; it was fixed and those2 tests both passed on rerun. The subsequently added waveform/multi-selection/saved-template browser test has not been rerun as an automated suite after environment approval limits. Waveforms and saved project access were observed manually in the live browser.
- Real MCP→Laravel→Remotion creation/edit/validation/render/PNG retrieval passed. `examples/output/mcp-verification.json` stores actual job/project identifiers and FFprobe metadata; the test project was archived, not deleted.
- Actual portableZIP restore through live services preserved Persian copy, remapped project/asset IDs and restored audio with the sameSHA256. Details in `docs/backend.md`.
- Uploaded local Inter font was rendered to a realPNG/MP4. Missing required-font output failed explicitly. Required-font fallback was not silently substituted.
- Real ThreeCanvas PBR frames were rendered and visually reviewed. The target machine's GPU encoding was not verified; software encoding is used.

## Real demo media

The website20s, SaaS30s and Persian18s demos exist as actual540×960,30FPS MP4 files with H.264 video and AAC audio. Original synthesizedPCM audio is included; no commercial songs are bundled. Actual thumbnails/contact sheets were rendered. Persian glyph shaping and layout were visually inspected and an overlap corrected before export.

Early verified files were playable but FFprobe exposed a full-range `yuvj420p` format from Remotion's JPEG defaults. The renderer now uses PNG frames and explicitBT.709 limited range, and strictly checks `yuv420p`, dimensions,FPS,duration,H.264/AAC. Actual shortMP4 andWebM tests passed the corrected contract. Main demo collection is updated from the corrected completed jobs; metadata records the source project hash and encoding properties.

Full-frame decoding of the initial3 demos withFFmpeg succeeded. Recorded early draft elapsed times were44.4s website,65.8s SaaS,41.8s Persian; these are host measurements, not promised RTX4060Ti benchmarks. CorrectedPNG-frame encoding timings are recorded in collected job metadata and may differ.

## Verification limits

Ubuntu/PHP8.5/Node24/Chrome was exercised. Windows11 startup is documented and statically reviewed, not executed. No installedOllama model was available, so its local transport is tested with mocked model output only. Public remote hosting, OAuth discovery, hardware encoding, automatic visual inspection and production penetration testing are not claimed.

During final work the environment's automatic command-approval review became unavailable due to account usage limits. The additional startup-command check and final complete browser rerun were therefore not executed. Typecheck/build and focused non-network tests continued; the live studio and saved projects were confirmed through the browser. This was an approval-service availability failure, not an assessment that startup was unsafe.
