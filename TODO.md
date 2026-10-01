# TODO

## Release / updater

- Point the app updater at Storyboard Forge's own release feed on `lioneltchami/storyboard-forge`.
- Re-enable startup update checks only after the new release channel is ready and verified.
- Verify the update dialog uses English release notes and download links from the new repo.

## Follow-up

- Review upstream changes selectively before merging anything from the old project.
- Keep the updater frozen until we control the full release path end to end.

## Ranked import queue

### 1. Safe / quick wins

- Any isolated upstream bug fixes that do not touch the update channel or prompt schema.
- Documentation-only clarifications that help English users follow the app.
- Small UI polish that is fully localized and does not affect shared store contracts.

### 2. Medium-risk feature imports

- Seedance 2.0 workbench and the S-level workflow split introduced in `v0.2.6`.
- Mac universal desktop installers, S-class nine-grid / board workflows, and local video saving from `v0.2.7`.
- English-version polish, ad studio, GPT Image 2 templates, Seedance 2.0 templates, and music studio from `v0.2.8`.
- Standalone image-processing entry, brush blur / blackout reuse, undo / clear, PNG export, and local `local-image://` saving from `v0.2.9`.
- Broader service-mapping and model-capability routing improvements from the `v0.2.8` / `v0.2.7` release notes.

### 3. Larger refactors / revisit later

- Any upstream changes that modify shared generation contracts, prompt payloads, or store schemas.
- Any update-system changes until our own release feed is live.
- Any merged feature that would require coordinated UI, store, and docs changes across multiple panels.
