# Changelog

## v0.1.3 - Major fix release: much stronger character consistency and generation stability

### ⭐ S-Class - Storyboard card architecture upgrade (split-scene-card)

```
Storyboard card (split-scene-card)
│
├─ [Character library] -> characterIds ───────────────┐
├─ [Scene reference] -> sceneReferenceImage ──────────┤  Auto-collected
├─ [From media library] -> imageDataUrl (replace first frame) ──┤
├─ [AI-generated] -> imageDataUrl (generate first frame) ────────┤
│                                                               ▼
│                                              GroupRefManager (@referenced assets)
│                                              ├── Images: character + scene + first frame (auto, up to 9)
│                                              ├── Videos: camera movement references (manual upload, up to 3)
│                                              └── Audio: BGM references (manual upload, up to 3)
│                                                               │
│                                                               ▼
│                                              collectAllRefs() -> assemble API request
│                                              ├── @Image1 = tiled image / first frame
│                                              ├── @Image2~9 = character and scene references
│                                              ├── @Video1~3 = camera movement references
│                                              └── @Audio1~3 = BGM
│                                                               │
│                                                               ▼
└──────────────── S-Class video generation (Seedance 2.0 API) ◀──┘
```

### Key Improvements

- Much stronger character consistency: storyboard cards now automatically collect character reference images, scene references, and first frames, then package them into GroupRefManager
- Better generation stability: `collectAllRefs()` intelligently assembles API requests and automatically respects Seedance 2.0 constraints (up to 9 images, 3 videos, 3 audio items, and a 5,000-character prompt limit)
- Smoother batch generation: improved concurrency queueing and error recovery

### Fixes

- Fixed the Director panel right sidebar being hidden at default window sizes (`ResizablePanel` `min-w-0`)
- Removed deprecated providers (`dik3`, `nanohajimi`, `apimart`, `zhipu`), added v6 -> v7 data migration, and automatically cleaned persisted legacy data
- Improved the feature binding panel: multi-select mode, model grouping, and search

### Architecture Improvements

- Multimodal reference management: GroupRefManager now manages image, video, and audio references in one place
- First-frame grid stitching: automatically stitches multi-character and multi-scene references with an N x N strategy
- Provider system simplified: only the two core providers remain, Storyboard Forge API (`memefast`) and RunningHub
- Removed all deprecated provider code and UI

### Miscellaneous

- Removed git tracking for `out/` build artifacts
- Added demo project seeding for the Basketball Girl sample
- Added a help entry in the sidebar

---

## v0.1.2

- Initial open-source release
- Five major modules: Script -> Characters -> Scenes -> Director -> S-Class
- Multi-provider AI orchestration with API key rotation
- Seedance 2.0 integration
- Electron + React + TypeScript stack
