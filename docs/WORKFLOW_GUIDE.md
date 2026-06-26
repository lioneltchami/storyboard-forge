# Full pre-install help is available here
[Pre-install setup guide](../PRE_INSTALL_SETUP_GUIDE.md)

# Storyboard Forge - Basic Workflow Guide

> A practical guide from script to finished video

Storyboard Forge includes multiple workflows. Each panel can be used independently or combined with the others for different creative workflows. This guide covers the most common baseline path and is the recommended starting point for new users.

> Language note: the UI can now be used in English, but prompt language is still separate from UI language. Some model-facing fields and reference materials may remain Chinese-first in specific workflows.

---

## Workflow Overview

```text
Preparation -> Script -> AI calibration -> Scenes / Characters (optional) -> Director / S-Class -> Generate video
```

---

## Preparation

Before you begin, complete these setup steps:

### 1. Add API providers

Go to `Settings -> API Configuration -> Add Provider` and configure your AI provider accounts.

- Add as many API keys as practical. The app supports multi-key rotation and load balancing.
- More keys allow higher concurrency and faster batch generation.
- Supported providers include `memefast`, `RunningHub`, and others.

### 2. Configure service mapping

Go to `Settings -> Service Mapping` and choose the AI model used for each feature.

- Assign models separately for text-to-image, image-to-video, text-to-video, and related tasks.
- Choose the model that best fits your provider setup and workflow needs.

Recommended starter models:
- Image generation: `gemini-3-pro-image-preview`
- Video generation: `doubao-seedance-1-5-pro-251215`

### 3. Configure image hosting

Go to `Settings -> Image Host` and configure an image hosting service.

- Use it to upload reference images, first frames, and other working assets.
- As with API providers, multiple keys can help with concurrent uploads.

Once these are configured, you are ready to create.

---

## Step 1: Script Panel

Open the `Script` panel. You can begin in one of two ways:

- Import a script: paste or import a complete screenplay into the editor
- AI creation: use AI assistance to create a script from scratch

For formatting guidance, see [SCRIPT_FORMAT_EXAMPLE.md](./SCRIPT_FORMAT_EXAMPLE.md).

The system will automatically analyze the script into structured scenes, storyboard shots, characters, dialogue, and related elements.

---

## Step 2: AI Calibration

After the initial analysis completes, run these calibration steps in order:

1. AI scene calibration
2. API storyboard calibration
3. AI character calibration

These steps deepen the scene, shot, and character descriptions and generate more refined prompts for later image and video creation.

---

## Step 3: Generate Assets (Optional)

After calibration, you can optionally generate assets in advance:

- Generate scenes: batch-create scene reference images from calibrated scene descriptions
- Generate characters: create character reference images from calibrated character descriptions

This step is optional. If you move directly into the Director or S-Class panels, the app can still use the related assets automatically.

---

## Step 4: Move into Director or S-Class

Switch to the `Director` panel or the `S-Class` panel.

1. Click `Load screenplay storyboard` in the right sidebar to import all storyboard shots from the script.
2. The left sidebar will automatically populate:
   - First-frame prompt
   - Last-frame prompt
   - Video prompt
3. You can freely fine-tune all parameters, including camera movement, duration, and style.

---

## Step 5: Generate Images and Video

Inside the storyboard editor in the Director or S-Class panel:

### Image generation methods

- Single-shot generation: generate each storyboard frame individually
- Merged generation: generate multiple storyboard frames in a batch

Merged generation is usually the better option. The resulting images are automatically assigned back to the corresponding storyboard frames.

### Video generation

Once images are assigned, click `Generate video` to start batch video creation.

---

## Step 6: S-Class Advanced Workflow with Seedance 2.0

The S-Class panel supports multi-shot narrative generation with Seedance 2.0.

1. After importing the script, choose how to group shots into video segments.
2. The system automatically gathers `@Image`, `@Video`, and `@Audio` multimodal references.
3. Click `Generate video`.

The S-Class workflow also handles first-frame stitching, three-layer prompt fusion, and parameter constraint validation automatically.

---

## Tips

- Calibrate before generating. The second-pass calibration noticeably improves quality.
- Prefer merged generation when possible. It is usually faster and more stylistically consistent.
- Fine-tune parameters freely. Prompts, first frames, and last frames can all be adjusted manually per shot.
- Use S-Class when you need multi-shot narrative continuity.
- Use Director when you want finer shot-by-shot control.
- Keep prompt language separate from UI language. English UI does not automatically change the underlying script-analysis or prompt-generation contract.

## English Reference Files

- [README.md](../README.md): product overview and quick start
- [SCRIPT_FORMAT_EXAMPLE.md](./SCRIPT_FORMAT_EXAMPLE.md): import structure reference
- [SCRIPT_FORMAT_EXAMPLE_EN.md](./SCRIPT_FORMAT_EXAMPLE_EN.md): English companion example for the same structure

---

Questions or issues:
- Email: [memecalculate@gmail.com](mailto:memecalculate@gmail.com)
- Repo overview: [README.md](../README.md)
