// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
/**
 * Media-Type Tokens - translation layer for cinematography parameters by media type
 *
 * Core responsibility: translate physical cinematography prompt tokens into
 * equivalent expressions that each media type can handle.
 *
 * Translation strategy:
 * - cinematic  -> pass through, keep all physical cinematography terms
 * - animation  -> adapt to virtual-camera semantics (dolly -> parallax motion, DOF -> layered blur)
 * - stop-motion -> constrain to miniature live-action semantics (dolly -> miniature track, DOF -> macro lens)
 * - graphic    -> skip physical parameters and express lighting as color / mood / rhythm
 */

import type { MediaType } from '@/lib/constants/visual-styles';

// ==================== Field types ====================

export type CinematographyField =
  | 'cameraRig'
  | 'shotSize'
  | 'movementSpeed'
  | 'depthOfField'
  | 'focusTransition'
  | 'lightingStyle'
  | 'lightingDirection'
  | 'colorTemperature'
  | 'atmosphericEffect'
  | 'effectIntensity'
  | 'playbackSpeed'
  | 'cameraAngle'
  | 'focalLength'
  | 'photographyTechnique';

// ==================== Translation tables ====================

/**
 * Field-level translation table for each non-cinematic media type.
 * - key = preset id
 * - value = replacement promptToken (empty string = silent skip)
 *
 * preset ids not in the table -> keep the original token (compatible with future presets)
 */
type FieldOverrides = Record<string, string>;

/**
 * 'skip' means this field should be skipped entirely for the media type (return an empty string).
 */
type FieldStrategy = FieldOverrides | 'skip';

type MediaTranslationTable = Partial<Record<CinematographyField, FieldStrategy>>;

// ---------- animation ----------

const ANIMATION_TABLE: MediaTranslationTable = {
  cameraRig: {
    tripod:    'static frame composition,',
    handheld:  'slight camera wobble, animated shake,',
    steadicam: 'smooth gliding virtual camera,',
    dolly:     'smooth tracking with parallax layers,',
    crane:     'sweeping vertical arc camera,',
    drone:     'aerial sweeping bird-eye view,',
    shoulder:  'subtle animated camera sway,',
    slider:    'smooth lateral pan with depth shift,',
  },
  depthOfField: {
    'ultra-shallow': 'dreamy layered blur, strong foreground-background separation,',
    shallow:         'soft background blur, depth layers,',
    medium:          'moderate depth layering,',
    deep:            'all layers in sharp focus,',
    'split-diopter': 'dual-plane sharp focus, foreground and background clear,',
  },
  focusTransition: {
    none:           '',
    'rack-to-fg':   'focus shift to foreground layer,',
    'rack-to-bg':   'focus shift to background layer,',
    'rack-between': 'focus shift between character layers,',
    'pull-focus':   'focus tracking subject movement,',
  },
  // lightingStyle / lightingDirection / colorTemperature / movementSpeed / playbackSpeed
  // -> conceptually compatible, so we keep the original token
  // cameraAngle / focalLength / photographyTechnique -> can be used directly by a virtual camera
};

// ---------- stop-motion ----------

const STOP_MOTION_TABLE: MediaTranslationTable = {
  cameraRig: {
    tripod:    'locked miniature camera, tabletop framing,',
    handheld:  'subtle stop-motion jitter,',
    steadicam: 'smooth miniature track movement,',
    dolly:     'miniature rail push-in,',
    crane:     'overhead rig on miniature set,',
    drone:     'overhead crane angle, miniature landscape,',
    shoulder:  'gentle stop-motion wobble,',
    slider:    'miniature slider lateral movement,',
  },
  depthOfField: {
    'ultra-shallow': 'macro lens extreme bokeh, tilt-shift miniature feel,',
    shallow:         'macro lens shallow DOF, miniature scale emphasis,',
    medium:          'moderate DOF, miniature set visible,',
    deep:            'deep focus, full miniature set sharp,',
    'split-diopter': 'split focus, miniature foreground and background sharp,',
  },
  focusTransition: {
    none:           '',
    'rack-to-fg':   'rack focus to foreground prop,',
    'rack-to-bg':   'rack focus to miniature background,',
    'rack-between': 'rack focus between miniature figures,',
    'pull-focus':   'pull focus following figure movement,',
  },
  playbackSpeed: {
    'slow-motion-4x': 'fewer frames per movement, very deliberate pacing,',
    'slow-motion-2x': 'reduced frame rate, deliberate pacing,',
    normal:           '',
    'fast-2x':        'rapid frame sequence,',
    timelapse:        'rapid stop-motion sequence, time compression,',
  },
};

// ---------- graphic ----------

const GRAPHIC_TABLE: MediaTranslationTable = {
  // Physical cinematography parameters -> skip entirely
  cameraRig:       'skip',
  movementSpeed:   'skip',
  depthOfField:    'skip',
  focusTransition: 'skip',
  lightingDirection: 'skip',
  cameraAngle:             'skip',
  focalLength:             'skip',
  photographyTechnique:    'skip',
  // Lighting style -> translate into color / mood
  lightingStyle: {
    'high-key':    'bright palette, open composition,',
    'low-key':     'dark tones, heavy contrast areas,',
    silhouette:    'solid dark shapes against light ground,',
    chiaroscuro:   'strong light-dark contrast zones,',
    natural:       'natural color palette,',
    neon:          'vibrant neon color accents,',
    candlelight:   'warm golden amber tint,',
    moonlight:     'cool blue-silver tint,',
  },
  // Color temperature -> tone bias
  colorTemperature: {
    warm:          'warm orange-amber tones,',
    neutral:       'balanced neutral palette,',
    cool:          'cool blue tones,',
    'golden-hour': 'warm golden cast,',
    'blue-hour':   'twilight blue-purple cast,',
    mixed:         'mixed warm and cool accents,',
  },
  // Playback speed -> rhythm description
  playbackSpeed: {
    'slow-motion-4x': 'slow deliberate pacing,',
    'slow-motion-2x': 'slow pacing,',
    normal:           '',
    'fast-2x':        'rapid sequence,',
    timelapse:        'compressed time sequence,',
  },
};

// ---------- Lookup table summary ----------

const TRANSLATION_TABLES: Partial<Record<MediaType, MediaTranslationTable>> = {
  animation: ANIMATION_TABLE,
  'stop-motion': STOP_MOTION_TABLE,
  graphic: GRAPHIC_TABLE,
  // cinematic does not need a translation table
};

// ==================== Core functions ====================

/**
 * Translate a cinematography token into the equivalent expression for the current media type.
 *
 * @param mediaType   - Current visual style's media type
 * @param field       - Cinematography field
 * @param presetId    - Preset ID (for example 'dolly' or 'shallow')
 * @param originalToken - Original promptToken from preset data
 * @returns Translated token; an empty string means the parameter does not apply to this media type
 */
export function translateToken(
  mediaType: MediaType,
  field: CinematographyField,
  presetId: string,
  originalToken: string,
): string {
  // cinematic -> pass through
  if (mediaType === 'cinematic') return originalToken;

  const table = TRANSLATION_TABLES[mediaType];
  if (!table) return originalToken;

  const strategy = table[field];

  // No special handling for this field -> keep the original token
  if (strategy === undefined) return originalToken;

  // Skip entirely
  if (strategy === 'skip') return '';

  // Replace via lookup table
  const override = strategy[presetId];
  return override !== undefined ? override : originalToken;
}

/**
 * Check whether a field is skipped for the current media type (UI can use this to gray it out).
 */
export function isFieldSkipped(mediaType: MediaType, field: CinematographyField): boolean {
  if (mediaType === 'cinematic') return false;
  const table = TRANSLATION_TABLES[mediaType];
  return table?.[field] === 'skip';
}

/**
 * Get a short guidance string for the media type (used in the AI calibration system prompt).
 */
export function getMediaTypeGuidance(mediaType: MediaType): string {
  switch (mediaType) {
    case 'cinematic':
      return 'This is a cinematic/live-action visual style. Use full physical cinematography vocabulary — real camera rigs, lens optics, lighting setups.';
    case 'animation':
      return 'This is an animation style. Adapt camera terms to virtual camera equivalents — use parallax layers instead of physical dolly, layer blur instead of optical DOF. Keep lighting and mood concepts.';
    case 'stop-motion':
      return 'This is a stop-motion style. Frame everything as miniature/tabletop photography — macro lenses, miniature sets, practical lighting on small scale. Respect frame-by-frame pacing.';
    case 'graphic':
      return 'This is a highly abstract graphic style (pixel art, watercolor, line art, etc.). Do NOT use physical camera or lens terminology. Describe visual composition, color palette, mood, and rhythm instead.';
  }
}
