// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
/**
 * Prompt Builder - unified video prompt assembly module
 *
 * Core principle: organize prompts into semantic layers to avoid signal dilution from fragmented stacking
 * Layer 1: Camera design - highest priority
 * Layer 1.5: Lighting design
 * Layer 2: Subject focus - second priority
 * Layer 3: Mood enhancement - supporting layer
 * Layer 4: Setting & audio
 * Layer 5: Visual style
 * Base: User prompt
 *
 * Cinematography profile fallback rule: when a shot-level field is empty, use the project-level default
 */

import type { SplitScene, EmotionTag } from '@/stores/director-store';
import {
  SHOT_SIZE_PRESETS,
  CAMERA_RIG_PRESETS,
  MOVEMENT_SPEED_PRESETS,
  DEPTH_OF_FIELD_PRESETS,
  FOCUS_TRANSITION_PRESETS,
  LIGHTING_STYLE_PRESETS,
  LIGHTING_DIRECTION_PRESETS,
  COLOR_TEMPERATURE_PRESETS,
  ATMOSPHERIC_EFFECT_PRESETS,
  EFFECT_INTENSITY_PRESETS,
  PLAYBACK_SPEED_PRESETS,
  EMOTION_PRESETS,
  CAMERA_ANGLE_PRESETS,
  FOCAL_LENGTH_PRESETS,
  PHOTOGRAPHY_TECHNIQUE_PRESETS,
  CAMERA_MOVEMENT_PRESETS,
  SPECIAL_TECHNIQUE_PRESETS,
} from '@/stores/director-store';
import type { CinematographyProfile } from '@/lib/constants/cinematography-profiles';
import type { MediaType } from '@/lib/constants/visual-styles';
import { translateToken, type CinematographyField } from '@/lib/generation/media-type-tokens';
import type { PromptLanguage } from '@/types/script';

// ==================== Helper functions ====================

/**
 * Build a mood description from emotion tags.
 */
export function buildEmotionDescription(emotionTags: EmotionTag[]): string {
  if (!emotionTags || emotionTags.length === 0) return '';

  const allPresets = [
    ...EMOTION_PRESETS.basic,
    ...EMOTION_PRESETS.atmosphere,
    ...EMOTION_PRESETS.tone,
  ];

  const labels = emotionTags.map(tagId => {
    const preset = allPresets.find(p => p.id === tagId);
    return preset?.label || tagId;
  });

  if (labels.length === 1) {
    return `Mood: ${labels[0]}. `;
  } else if (labels.length === 2) {
    return `Mood shifts from ${labels[0]} to ${labels[1]}. `;
  } else {
    const progression = `${labels.slice(0, -1).join(', ')}, then ${labels[labels.length - 1]}`;
    return `Mood progresses through ${progression}. `;
  }
}

// ==================== Preset lookup helpers ====================

/**
 * Look up a preset token and apply media-type translation.
 * When mediaType is undefined, treat it as cinematic (pass-through).
 */
function findPresetToken<T extends { id: string; promptToken: string }>(
  presets: readonly T[],
  id: string | undefined,
  mediaType: MediaType | undefined,
  field: CinematographyField,
): string | undefined {
  if (!id) return undefined;
  const preset = presets.find(p => p.id === id);
  if (!preset?.promptToken) return undefined;
  const translated = translateToken(mediaType ?? 'cinematic', field, id, preset.promptToken);
  return translated || undefined; // Empty string -> undefined (skip)
}

// ==================== Video prompt build configuration ====================

export interface VideoPromptConfig {
  /** Visual-style tokens */
  styleTokens?: string[];
  /** Aspect ratio (context only) */
  aspectRatio?: '16:9' | '9:16';
  /** Media type - controls the cinematography translation strategy */
  mediaType?: MediaType;
  /** Prompt-language preference for the scene's authored prompt. */
  promptLanguage?: PromptLanguage;
}

// ==================== Core function ====================

/**
 * Build the full prompt for video generation.
 *
 * @param scene - Shot data (SplitScene)
 * @param cinProfile - Cinematography profile (undefined means not set)
 * @param config - Extra configuration (styleTokens, etc.)
 * @returns The assembled prompt string
 */
export function buildVideoPrompt(
  scene: SplitScene,
  cinProfile: CinematographyProfile | undefined,
  config: VideoPromptConfig = {},
): string {
  const promptParts: string[] = [];
  const mt = config.mediaType;

  // ---------- Layer 1: Camera design ----------
  const cameraDesignParts: string[] = [];

  // 1.0 Rig type - shot-level first, then profile fallback
  const effectiveRig = scene.cameraRig || cinProfile?.defaultRig?.cameraRig;
  const rigToken = findPresetToken(CAMERA_RIG_PRESETS, effectiveRig, mt, 'cameraRig');
  if (rigToken) cameraDesignParts.push(rigToken);

  // 1.1 Check for an advanced camera-position description
  const hasCameraPosition = scene.cameraPosition?.trim();

  // 1.2 Starting shot size (only when there is no advanced camera-position description)
  if (!hasCameraPosition && scene.shotSize) {
    const shotPreset = SHOT_SIZE_PRESETS.find(p => p.id === scene.shotSize);
    if (shotPreset) {
      cameraDesignParts.push(`starts ${shotPreset.labelEn.toLowerCase()}`);
    }
  }

  // 1.3 Camera position and movement
  if (hasCameraPosition) {
    cameraDesignParts.push(scene.cameraPosition!.trim());
  } else if (scene.cameraMovement?.trim() && scene.cameraMovement !== 'none') {
    // Look up the preset promptToken first; fall back to the original value for legacy data
    const cmPreset = CAMERA_MOVEMENT_PRESETS.find(p => p.id === scene.cameraMovement);
    cameraDesignParts.push(cmPreset?.promptToken || scene.cameraMovement.trim());
  }

  // 1.35 Shooting angle - shot-level first, then profile fallback
  const effectiveAngle = scene.cameraAngle || cinProfile?.defaultAngle;
  if (effectiveAngle && effectiveAngle !== 'eye-level') {
    const angleToken = findPresetToken(CAMERA_ANGLE_PRESETS, effectiveAngle, mt, 'cameraAngle');
    if (angleToken) cameraDesignParts.push(angleToken);
  }

  // 1.4 Motion speed - shot-level first, then profile fallback
  const effectiveSpeed = scene.movementSpeed || cinProfile?.defaultRig?.movementSpeed;
  if (effectiveSpeed && effectiveSpeed !== 'normal') {
    const token = findPresetToken(MOVEMENT_SPEED_PRESETS, effectiveSpeed, mt, 'movementSpeed');
    if (token) cameraDesignParts.push(token);
  }

  // 1.5 Rhythm modifiers
  if (scene.rhythm?.trim()) {
    cameraDesignParts.push(`${scene.rhythm.trim()} rhythm`);
  }

  // 1.6 Depth of field and focus - shot-level first, then profile fallback
  const effectiveDof = scene.depthOfField || cinProfile?.defaultFocus?.depthOfField;
  const dofToken = findPresetToken(DEPTH_OF_FIELD_PRESETS, effectiveDof, mt, 'depthOfField');
  if (dofToken) cameraDesignParts.push(dofToken);

  if (scene.focusTarget?.trim()) {
    cameraDesignParts.push(`focus on ${scene.focusTarget.trim()}`);
  }

  const effectiveFt = scene.focusTransition || cinProfile?.defaultFocus?.focusTransition;
  if (effectiveFt && effectiveFt !== 'none') {
    const token = findPresetToken(FOCUS_TRANSITION_PRESETS, effectiveFt, mt, 'focusTransition');
    if (token) cameraDesignParts.push(token);
  }

  // 1.7 Focal length - shot-level first, then profile fallback
  const effectiveFL = scene.focalLength || cinProfile?.defaultFocalLength;
  if (effectiveFL) {
    const flToken = findPresetToken(FOCAL_LENGTH_PRESETS, effectiveFL, mt, 'focalLength');
    if (flToken) cameraDesignParts.push(flToken);
  }

  // 1.8 Photography technique - shot-level first, then profile fallback
  const effectiveTech = scene.photographyTechnique || cinProfile?.defaultTechnique;
  if (effectiveTech) {
    const techToken = findPresetToken(PHOTOGRAPHY_TECHNIQUE_PRESETS, effectiveTech, mt, 'photographyTechnique');
    if (techToken) cameraDesignParts.push(techToken);
  }

  // 1.9 Special shooting techniques
  if ((scene as any).specialTechnique && (scene as any).specialTechnique !== 'none') {
    const stPreset = SPECIAL_TECHNIQUE_PRESETS.find(p => p.id === (scene as any).specialTechnique);
    if (stPreset?.promptToken) cameraDesignParts.push(stPreset.promptToken);
  }

  // Assemble Layer 1
  if (cameraDesignParts.length > 0) {
    promptParts.push(`Camera: ${cameraDesignParts.join(', ')}`);
  }

  // ---------- Layer 1.5: Lighting design ----------
  const lightingParts: string[] = [];

  const effectiveLs = scene.lightingStyle || cinProfile?.defaultLighting?.style;
  const lsToken = findPresetToken(LIGHTING_STYLE_PRESETS, effectiveLs, mt, 'lightingStyle');
  if (lsToken) lightingParts.push(lsToken);

  const effectiveLd = scene.lightingDirection || cinProfile?.defaultLighting?.direction;
  const ldToken = findPresetToken(LIGHTING_DIRECTION_PRESETS, effectiveLd, mt, 'lightingDirection');
  if (ldToken) lightingParts.push(ldToken);

  const effectiveCt = scene.colorTemperature || cinProfile?.defaultLighting?.colorTemperature;
  const ctToken = findPresetToken(COLOR_TEMPERATURE_PRESETS, effectiveCt, mt, 'colorTemperature');
  if (ctToken) lightingParts.push(ctToken);

  if (scene.lightingNotes?.trim()) {
    lightingParts.push(scene.lightingNotes.trim());
  }

  if (lightingParts.length > 0) {
    promptParts.push(`Lighting: ${lightingParts.join(' ')}`);
  }

  // ---------- Layer 2: Subject & focus ----------
  const subjectParts: string[] = [];

  if (scene.characterBlocking?.trim()) {
    subjectParts.push(scene.characterBlocking.trim());
  }
  if (scene.actionSummary?.trim()) {
    subjectParts.push(scene.actionSummary.trim());
  }
  if (scene.visualFocus?.trim()) {
    subjectParts.push(`focus on ${scene.visualFocus.trim()}`);
  }

  if (subjectParts.length > 0) {
    promptParts.push(`Subject: ${subjectParts.join(', ')}`);
  }

  // ---------- Layer 3: Mood & narrative ----------
  const emotionDesc = buildEmotionDescription(scene.emotionTags || []);
  if (emotionDesc) {
    promptParts.push(`Mood: ${emotionDesc}`);
  }

  if (scene.narrativeFunction?.trim()) {
    promptParts.push(`Narrative purpose: ${scene.narrativeFunction.trim()}`);
  }
  if (scene.shotPurpose?.trim()) {
    promptParts.push(`Shot intent: ${scene.shotPurpose.trim()}`);
  }

  // 3.4 Atmospheric effects - shot-level first, then profile fallback
  const effectiveAtmo = (scene.atmosphericEffects && scene.atmosphericEffects.length > 0)
    ? scene.atmosphericEffects
    : cinProfile?.defaultAtmosphere?.effects;

  if (effectiveAtmo && effectiveAtmo.length > 0) {
    const allEffects = [
      ...ATMOSPHERIC_EFFECT_PRESETS.weather,
      ...ATMOSPHERIC_EFFECT_PRESETS.environment,
      ...ATMOSPHERIC_EFFECT_PRESETS.artistic,
    ];
    const effectTokens = effectiveAtmo
      .map(eid => {
        const e = allEffects.find(ef => ef.id === eid);
        if (!e?.promptToken) return undefined;
        const translated = translateToken(mt ?? 'cinematic', 'atmosphericEffect', eid, e.promptToken);
        return translated || undefined;
      })
      .filter(Boolean);

    if (effectTokens.length > 0) {
      const effectiveIntensity = scene.effectIntensity || cinProfile?.defaultAtmosphere?.intensity;
      const intensityPreset = effectiveIntensity
        ? EFFECT_INTENSITY_PRESETS.find(p => p.id === effectiveIntensity)
        : null;
      let intensityPrefix = '';
      if (intensityPreset?.promptToken) {
        const translatedIntensity = translateToken(mt ?? 'cinematic', 'effectIntensity', effectiveIntensity!, intensityPreset.promptToken);
        intensityPrefix = translatedIntensity ? `${translatedIntensity} ` : '';
      }
      promptParts.push(`Atmosphere: ${intensityPrefix}${effectTokens.join(', ')}`);
    }
  }

  // ---------- Layer 4: Setting & audio ----------
  if (scene.sceneName || scene.sceneLocation) {
    const sceneInfo = [scene.sceneName, scene.sceneLocation].filter(Boolean).join(' - ');
    promptParts.push(`Setting: ${sceneInfo}`);
  }

  // Dialogue: include when there is content and it is enabled; otherwise explicitly forbid it
  if (scene.audioDialogueEnabled !== false && scene.dialogue?.trim()) {
    promptParts.push(`Dialogue: "${scene.dialogue.trim()}"`);
  } else {
    promptParts.push('Dialogue: no dialogue');
  }
  // Ambient sound: include when there is content and it is enabled; otherwise explicitly forbid it
  if (scene.audioAmbientEnabled !== false && scene.ambientSound?.trim()) {
    promptParts.push(`Ambient: ${scene.ambientSound.trim()}`);
  } else {
    promptParts.push('Ambient: no ambient sound');
  }
  // Sound effects: include when there is content and it is enabled; otherwise explicitly forbid it
  if (scene.audioSfxEnabled !== false && scene.soundEffectText?.trim()) {
    promptParts.push(`SFX: ${scene.soundEffectText.trim()}`);
  } else {
    promptParts.push('SFX: no sound effects');
  }
  // Background music: include when there is content and it is enabled; otherwise explicitly forbid it
  if (scene.audioBgmEnabled === true && scene.backgroundMusic?.trim()) {
    promptParts.push(`Music: ${scene.backgroundMusic.trim()}`);
  } else {
    promptParts.push('Music: no background music');
  }

  // ---------- Layer 5: Visual style ----------
  if (config.styleTokens && config.styleTokens.length > 0) {
    promptParts.push(`Style: ${config.styleTokens.join(', ')}`);
  }

  // ---------- Base prompt: user video prompt ----------
  const preferChinese = config.promptLanguage === 'zh' || config.promptLanguage === 'zh+en';
  const basePrompt = preferChinese
    ? scene.videoPromptZh || scene.videoPrompt || ''
    : scene.videoPrompt || scene.videoPromptZh || '';
  if (basePrompt.trim()) {
    promptParts.push(basePrompt.trim());
  }

  // ---------- Speed control (speed ramping) - shot-level first, then profile fallback ----------
  const effectivePbSpeed = scene.playbackSpeed || cinProfile?.defaultSpeed?.playbackSpeed;
  if (effectivePbSpeed && effectivePbSpeed !== 'normal') {
    const token = findPresetToken(PLAYBACK_SPEED_PRESETS, effectivePbSpeed, mt, 'playbackSpeed');
    if (token) promptParts.push(token);
  }

  // ---------- Continuity constraints ----------
  if (scene.continuityRef?.lightingContinuity?.trim()) {
    promptParts.push(scene.continuityRef.lightingContinuity.trim());
  }

  // Final assembly
  return promptParts.join('. ');
}
