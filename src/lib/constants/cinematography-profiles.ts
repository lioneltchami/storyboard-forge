// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
/**
 * Cinematography profile presets.
 *
 * Provides a project-level cinematography baseline between the visual style picker
 * and the per-shot shooting control fields. AI calibration uses this as the default
 * bias, and the prompt builder falls back here when per-shot fields are empty.
 */

import type {
  LightingStyle,
  LightingDirection,
  ColorTemperature,
  DepthOfField,
  FocusTransition,
  CameraRig,
  MovementSpeed,
  AtmosphericEffect,
  EffectIntensity,
  PlaybackSpeed,
  CameraAngle,
  FocalLength,
  PhotographyTechnique,
} from '@/types/script';

// ==================== Types ====================

export type CinematographyCategory =
  | 'cinematic'     // cinematic
  | 'documentary'   // documentary
  | 'stylized'      // stylized
  | 'genre'         // genre
  | 'era';          // era

export interface CinematographyProfile {
  id: string;
  name: string;          // display name
  nameEn: string;        // English display name
  category: CinematographyCategory;
  description: string;   // short description
  emoji: string;         // 标识 emoji

  // ---- 灯光默认 (Gaffer) ----
  defaultLighting: {
    style: LightingStyle;
    direction: LightingDirection;
    colorTemperature: ColorTemperature;
  };

  // ---- 焦点默认 (Focus Puller) ----
  defaultFocus: {
    depthOfField: DepthOfField;
    focusTransition: FocusTransition;
  };

  // ---- 器材默认 (Camera Rig) ----
  defaultRig: {
    cameraRig: CameraRig;
    movementSpeed: MovementSpeed;
  };

  // ---- 氛围默认 (On-set SFX) ----
  defaultAtmosphere: {
    effects: AtmosphericEffect[];
    intensity: EffectIntensity;
  };

  // ---- 速度默认 (Speed Ramping) ----
  defaultSpeed: {
    playbackSpeed: PlaybackSpeed;
  };

  // ---- 拍摄角度 / 焦距 / 技法默认（可选） ----
  defaultAngle?: CameraAngle;
  defaultFocalLength?: FocalLength;
  defaultTechnique?: PhotographyTechnique;

  // ---- AI Guidance ----
  /** Cinematography guidance for the AI (2-3 sentences, injected into the system prompt). */
  promptGuidance: string;
  /** Reference films to help the AI understand the target style. */
  referenceFilms: string[];
}

// ==================== Category Metadata ====================

export const CINEMATOGRAPHY_CATEGORIES: { id: CinematographyCategory; name: string; emoji: string }[] = [
  { id: 'cinematic', name: 'Cinematic', emoji: '🎬' },
  { id: 'documentary', name: 'Documentary', emoji: '📹' },
  { id: 'stylized', name: 'Stylized', emoji: '🎨' },
  { id: 'genre', name: 'Genre', emoji: '🎭' },
  { id: 'era', name: 'Era', emoji: '📅' },
];

// ==================== Preset Lists ====================

// ---------- Cinematic ----------

const CINEMATIC_PROFILES: CinematographyProfile[] = [
  {
    id: 'classic-cinematic',
    name: 'Classic Cinematic',
    nameEn: 'Classic Cinematic',
    category: 'cinematic',
    description: 'Standard theatrical film texture with three-point lighting, natural color temperature, steady dolly movement, and a composed, grand frame',
    emoji: '🎞️',
    defaultLighting: { style: 'natural', direction: 'three-point', colorTemperature: 'warm' },
    defaultFocus: { depthOfField: 'medium', focusTransition: 'rack-between' },
    defaultRig: { cameraRig: 'dolly', movementSpeed: 'slow' },
    defaultAtmosphere: { effects: [], intensity: 'subtle' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'eye-level',
    defaultFocalLength: '50mm',
    promptGuidance: 'Follow classic film grammar with three-point lighting as the foundation and warm tones for a polished theatrical feel. Use smooth dolly moves for stable motion, shallow depth of field for dialogue emotion, and deeper focus for establishing environments.',
    referenceFilms: ['The Shawshank Redemption', 'Forrest Gump', 'The Godfather'],
  },
  {
    id: 'film-noir',
    name: 'Film Noir',
    nameEn: 'Film Noir',
    category: 'cinematic',
    description: 'Low-key lighting, strong light-dark contrast, side light, cool tones, heavy atmosphere, and handheld breathing room',
    emoji: '🖤',
    defaultLighting: { style: 'low-key', direction: 'side', colorTemperature: 'cool' },
    defaultFocus: { depthOfField: 'shallow', focusTransition: 'rack-to-fg' },
    defaultRig: { cameraRig: 'handheld', movementSpeed: 'slow' },
    defaultAtmosphere: { effects: ['fog', 'smoke'], intensity: 'moderate' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'low-angle',
    defaultFocalLength: '35mm',
    promptGuidance: 'Film noir lives in light and shadow. Keep much of the frame in darkness, carve the character with a narrow side light, use cool tones and fog for unease, and let subtle handheld movement add grounded tension.',
    referenceFilms: ['Blade Runner', 'Chinatown', 'The Third Man', 'Sin City'],
  },
  {
    id: 'epic-blockbuster',
    name: 'Epic Blockbuster',
    nameEn: 'Epic Blockbuster',
    category: 'cinematic',
    description: 'Bright high-key lighting, frontal light, deep depth of field, large crane moves, lens flare, and epic scale',
    emoji: '⚔️',
    defaultLighting: { style: 'high-key', direction: 'front', colorTemperature: 'neutral' },
    defaultFocus: { depthOfField: 'deep', focusTransition: 'none' },
    defaultRig: { cameraRig: 'crane', movementSpeed: 'normal' },
    defaultAtmosphere: { effects: ['lens-flare', 'dust'], intensity: 'moderate' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'eye-level',
    defaultFocalLength: '24mm',
    promptGuidance: 'Epic scale comes from spatial depth. Use deep focus and sweeping crane moves to reveal large environments, bright frontal lighting for grandeur, lens flare and dust for spectacle, and shoulder-mounted energy during combat beats.',
    referenceFilms: ['The Lord of the Rings', 'Gladiator', 'Braveheart', 'Kingdom of Heaven'],
  },
  {
    id: 'intimate-drama',
    name: 'Intimate Drama',
    nameEn: 'Intimate Drama',
    category: 'cinematic',
    description: 'Natural side light, warm color temperature, shallow depth of field, static tripod framing, and quiet focus on character emotion',
    emoji: '🫂',
    defaultLighting: { style: 'natural', direction: 'side', colorTemperature: 'warm' },
    defaultFocus: { depthOfField: 'shallow', focusTransition: 'rack-between' },
    defaultRig: { cameraRig: 'tripod', movementSpeed: 'very-slow' },
    defaultAtmosphere: { effects: [], intensity: 'subtle' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'eye-level',
    defaultFocalLength: '85mm',
    promptGuidance: 'Intimate drama should pull the viewer into the character’s inner life. Use static framing, shallow depth of field, natural side light, and warm color temperature so small facial details carry the emotion.',
    referenceFilms: ['Manchester by the Sea', 'Marriage Story', 'In the Mood for Love'],
  },
  {
    id: 'romantic-film',
    name: 'Romantic Film',
    nameEn: 'Romantic Film',
    category: 'cinematic',
    description: 'Backlit golden-hour glow, ultra-shallow depth of field, smooth steadicam follow, god rays, and dreamy softness',
    emoji: '💕',
    defaultLighting: { style: 'natural', direction: 'back', colorTemperature: 'golden-hour' },
    defaultFocus: { depthOfField: 'ultra-shallow', focusTransition: 'pull-focus' },
    defaultRig: { cameraRig: 'steadicam', movementSpeed: 'slow' },
    defaultAtmosphere: { effects: ['light-rays', 'cherry-blossom'], intensity: 'subtle' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'eye-level',
    defaultFocalLength: '85mm',
    defaultTechnique: 'bokeh',
    promptGuidance: 'Romance is built around glowing backlight. Use golden-hour warmth, ultra-shallow focus, soft steadicam following, dreamy bokeh, and occasional petals or light rays to give the frame a lyrical softness.',
    referenceFilms: ['The Notebook', 'La La Land', 'Pride and Prejudice', 'Love Letter'],
  },
];

// ---------- Documentary ----------

const DOCUMENTARY_PROFILES: CinematographyProfile[] = [
  {
    id: 'documentary-raw',
    name: 'Raw Documentary',
    nameEn: 'Raw Documentary',
    category: 'documentary',
    description: 'Handheld breathing room, natural light, medium depth of field, frontal light, no embellishment, and raw realism',
    emoji: '📹',
    defaultLighting: { style: 'natural', direction: 'front', colorTemperature: 'neutral' },
    defaultFocus: { depthOfField: 'medium', focusTransition: 'pull-focus' },
    defaultRig: { cameraRig: 'handheld', movementSpeed: 'normal' },
    defaultAtmosphere: { effects: [], intensity: 'subtle' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'eye-level',
    defaultFocalLength: '35mm',
    promptGuidance: 'Raw documentary style should feel present and unpolished. Use handheld movement, natural light, live focus adjustments, and occasional imperfect focus shifts to make the scene feel observed rather than staged.',
    referenceFilms: ['Life Is Fruity', 'The Cove', 'Free Solo'],
  },
  {
    id: 'news-report',
    name: 'News Report',
    nameEn: 'News Report',
    category: 'documentary',
    description: 'Shoulder-mounted, high-key lighting, deep depth of field, neutral color temperature, information-first framing, and crisp clarity',
    emoji: '📡',
    defaultLighting: { style: 'high-key', direction: 'front', colorTemperature: 'neutral' },
    defaultFocus: { depthOfField: 'deep', focusTransition: 'none' },
    defaultRig: { cameraRig: 'shoulder', movementSpeed: 'normal' },
    defaultAtmosphere: { effects: [], intensity: 'subtle' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'eye-level',
    defaultFocalLength: '24mm',
    promptGuidance: 'News-report cinematography prioritizes clarity. Use deep focus, high-key lighting, stable shoulder-mounted movement, and information-first composition so important people and events remain readable at all times.',
    referenceFilms: ['Spotlight', 'All the President\'s Men', 'The Post'],
  },
];

// ---------- Stylized ----------

const STYLIZED_PROFILES: CinematographyProfile[] = [
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    nameEn: 'Cyberpunk Neon',
    category: 'stylized',
    description: 'Neon lighting, rim light, mixed color temperature, shallow depth of field, steadicam sliding, and a hazy atmosphere',
    emoji: '🌃',
    defaultLighting: { style: 'neon', direction: 'rim', colorTemperature: 'mixed' },
    defaultFocus: { depthOfField: 'shallow', focusTransition: 'rack-to-bg' },
    defaultRig: { cameraRig: 'steadicam', movementSpeed: 'slow' },
    defaultAtmosphere: { effects: ['haze', 'lens-flare'], intensity: 'moderate' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'low-angle',
    defaultFocalLength: '35mm',
    defaultTechnique: 'reflection',
    promptGuidance: 'Cyberpunk relies on warm-cool conflict. Mix magenta neon with icy blue light, use rim lighting to separate characters from dark backgrounds, add haze for volumetric glow, and slide the camera slowly through rainy urban space.',
    referenceFilms: ['Blade Runner 2049', 'Ghost in the Shell', 'The Matrix', 'Tron: Legacy'],
  },
  {
    id: 'wuxia-classic',
    name: 'Classic Wuxia',
    nameEn: 'Classic Wuxia',
    category: 'stylized',
    description: 'Natural side light, warm color temperature, medium depth of field, crane rises and drops, drifting mist, and classical elegance',
    emoji: '🗡️',
    defaultLighting: { style: 'natural', direction: 'side', colorTemperature: 'warm' },
    defaultFocus: { depthOfField: 'medium', focusTransition: 'rack-between' },
    defaultRig: { cameraRig: 'crane', movementSpeed: 'slow' },
    defaultAtmosphere: { effects: ['mist', 'falling-leaves'], intensity: 'moderate' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'eye-level',
    defaultFocalLength: '50mm',
    promptGuidance: 'Classic wuxia should feel poetic and atmospheric. Use mountain mist, falling leaves, crane movement, warm natural side light through bamboo-like patterns, and occasional slow motion to emphasize martial grace.',
    referenceFilms: ['Crouching Tiger, Hidden Dragon', 'Hero', 'The Assassin', 'The Grandmaster'],
  },
  {
    id: 'horror-thriller',
    name: 'Horror Thriller',
    nameEn: 'Horror Thriller',
    category: 'stylized',
    description: 'Low-key lighting, unsettling underlight, cool tones, shallow depth of field, shaky handheld movement, and dense fog',
    emoji: '👻',
    defaultLighting: { style: 'low-key', direction: 'bottom', colorTemperature: 'cool' },
    defaultFocus: { depthOfField: 'shallow', focusTransition: 'rack-to-bg' },
    defaultRig: { cameraRig: 'handheld', movementSpeed: 'very-slow' },
    defaultAtmosphere: { effects: ['fog', 'haze'], intensity: 'heavy' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'low-angle',
    defaultFocalLength: '24mm',
    promptGuidance: 'Horror is often scarier when it hides more than it shows. Use shallow focus, dense fog, unsettling underlight, creeping handheld motion, and sudden fast whip movements to break the slow tension at key moments.',
    referenceFilms: ['The Shining', 'Hereditary', 'The Conjuring', 'Ring'],
  },
  {
    id: 'music-video',
    name: 'Music Video',
    nameEn: 'Music Video',
    category: 'stylized',
    description: 'Neon backlight, mixed color temperature, ultra-shallow depth of field, circling steadicam, floating light particles, and strong visual impact',
    emoji: '🎵',
    defaultLighting: { style: 'neon', direction: 'back', colorTemperature: 'mixed' },
    defaultFocus: { depthOfField: 'ultra-shallow', focusTransition: 'pull-focus' },
    defaultRig: { cameraRig: 'steadicam', movementSpeed: 'fast' },
    defaultAtmosphere: { effects: ['particles', 'lens-flare'], intensity: 'heavy' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'low-angle',
    defaultFocalLength: '35mm',
    defaultTechnique: 'bokeh',
    promptGuidance: 'Music-video framing should be poster-like in every shot. Use ultra-shallow focus, neon backlight, fast steadicam circles, frequent speed changes, light particles, and lens flare for heightened visual impact.',
    referenceFilms: ['La La Land music video sequence', 'Beyoncé - Lemonade', 'The Weeknd - Blinding Lights'],
  },
];

// ---------- Genre ----------

const GENRE_PROFILES: CinematographyProfile[] = [
  {
    id: 'family-warmth',
    name: 'Family Warmth',
    nameEn: 'Family Warmth',
    category: 'genre',
    description: 'Natural frontal light, 3200K warm tones, medium depth of field, tripod stability, and the warmth of sunlight in a living room',
    emoji: '🏠',
    defaultLighting: { style: 'natural', direction: 'front', colorTemperature: 'warm' },
    defaultFocus: { depthOfField: 'medium', focusTransition: 'rack-between' },
    defaultRig: { cameraRig: 'tripod', movementSpeed: 'very-slow' },
    defaultAtmosphere: { effects: ['light-rays'], intensity: 'subtle' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'eye-level',
    defaultFocalLength: '50mm',
    promptGuidance: 'Family drama should feel like a quiet observer in the room. Use stable tripod framing, warm sunlight through windows, medium depth of field to keep family members readable, and soft light rays for gentle everyday poetry.',
    referenceFilms: ['Shoplifters', 'Still Walking', 'Reply 1988', 'All Is Well'],
  },
  {
    id: 'action-intense',
    name: 'Intense Action',
    nameEn: 'Intense Action',
    category: 'genre',
    description: 'High-key side light, neutral color temperature, medium depth of field, fast shoulder-mounted tracking, and flying dust',
    emoji: '💥',
    defaultLighting: { style: 'high-key', direction: 'side', colorTemperature: 'neutral' },
    defaultFocus: { depthOfField: 'medium', focusTransition: 'pull-focus' },
    defaultRig: { cameraRig: 'shoulder', movementSpeed: 'fast' },
    defaultAtmosphere: { effects: ['dust', 'sparks'], intensity: 'moderate' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'eye-level',
    defaultFocalLength: '24mm',
    defaultTechnique: 'high-speed',
    promptGuidance: 'Action cinematography should transmit kinetic force. Use fast shoulder-mounted tracking, side light to sharpen action lines, medium depth of field, brief slow motion on impact beats, then return quickly to normal speed.',
    referenceFilms: ['Mad Max: Fury Road', 'The Bourne Identity', 'The Raid', 'Mission: Impossible'],
  },
  {
    id: 'suspense-mystery',
    name: 'Suspense Mystery',
    nameEn: 'Suspense Mystery',
    category: 'genre',
    description: 'Low-key side light, cool tones, shallow depth of field, slow dolly push, misty atmosphere, and controlled reveal',
    emoji: '🔍',
    defaultLighting: { style: 'low-key', direction: 'side', colorTemperature: 'cool' },
    defaultFocus: { depthOfField: 'shallow', focusTransition: 'rack-to-fg' },
    defaultRig: { cameraRig: 'dolly', movementSpeed: 'very-slow' },
    defaultAtmosphere: { effects: ['mist'], intensity: 'subtle' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'eye-level',
    defaultFocalLength: '50mm',
    promptGuidance: 'Suspense depends on controlled information reveal. Use shallow focus, very slow dolly pushes, low-key side light, rack focus between clues and suspects, and light mist to keep the truth visually uncertain.',
    referenceFilms: ['Gone Girl', 'Se7en', 'Memories of Murder', '12 Angry Men'],
  },
];

// ---------- Era ----------

const ERA_PROFILES: CinematographyProfile[] = [
  {
    id: 'hk-retro-90s',
    name: '90s Hong Kong',
    nameEn: '90s Hong Kong',
    category: 'era',
    description: 'Neon side light, mixed color temperature, medium depth of field, handheld movement, thin haze, and Wong Kar-wai melancholy',
    emoji: '🌙',
    defaultLighting: { style: 'neon', direction: 'side', colorTemperature: 'mixed' },
    defaultFocus: { depthOfField: 'medium', focusTransition: 'rack-between' },
    defaultRig: { cameraRig: 'handheld', movementSpeed: 'normal' },
    defaultAtmosphere: { effects: ['haze', 'smoke'], intensity: 'moderate' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'eye-level',
    defaultFocalLength: '35mm',
    promptGuidance: '1990s Hong Kong style blends urban neon with wandering handheld movement. Mix red and blue city light, move through crowds, use slight step-printing or undercranked blur when appropriate, and shape melancholy faces with side light.',
    referenceFilms: ['Chungking Express', 'Fallen Angels', 'Infernal Affairs', 'A Better Tomorrow'],
  },
  {
    id: 'golden-age-hollywood',
    name: 'Golden Age Hollywood',
    nameEn: 'Golden Age Hollywood',
    category: 'era',
    description: 'High-key three-point lighting, warm color temperature, deep depth of field, graceful dolly movement, radiant glow, and elegant grandeur',
    emoji: '⭐',
    defaultLighting: { style: 'high-key', direction: 'three-point', colorTemperature: 'warm' },
    defaultFocus: { depthOfField: 'deep', focusTransition: 'none' },
    defaultRig: { cameraRig: 'dolly', movementSpeed: 'slow' },
    defaultAtmosphere: { effects: ['light-rays'], intensity: 'subtle' },
    defaultSpeed: { playbackSpeed: 'normal' },
    defaultAngle: 'eye-level',
    defaultFocalLength: '50mm',
    promptGuidance: 'Golden Age Hollywood aims for immaculate polish. Use high-key three-point lighting, deep focus, elegant dolly movement, warm nostalgic glow, and carefully composed frames that feel graceful, glamorous, and precise.',
    referenceFilms: ['Casablanca', 'Citizen Kane', 'Sunset Boulevard', 'Gone with the Wind'],
  },
];

// ==================== 导出 ====================

/** 所有摄影风格档案预设 */
export const CINEMATOGRAPHY_PROFILES: readonly CinematographyProfile[] = [
  ...CINEMATIC_PROFILES,
  ...DOCUMENTARY_PROFILES,
  ...STYLIZED_PROFILES,
  ...GENRE_PROFILES,
  ...ERA_PROFILES,
] as const;

/** 按分类组织 */
export const CINEMATOGRAPHY_PROFILE_CATEGORIES: {
  id: CinematographyCategory;
  name: string;
  emoji: string;
  profiles: readonly CinematographyProfile[];
}[] = [
  { id: 'cinematic', name: 'Cinematic', emoji: '🎬', profiles: CINEMATIC_PROFILES },
  { id: 'documentary', name: 'Documentary', emoji: '📹', profiles: DOCUMENTARY_PROFILES },
  { id: 'stylized', name: 'Stylized', emoji: '🎨', profiles: STYLIZED_PROFILES },
  { id: 'genre', name: 'Genre', emoji: '🎭', profiles: GENRE_PROFILES },
  { id: 'era', name: 'Era', emoji: '📅', profiles: ERA_PROFILES },
];

/** 根据 ID 获取摄影档案 */
export function getCinematographyProfile(profileId: string): CinematographyProfile | undefined {
  return CINEMATOGRAPHY_PROFILES.find(p => p.id === profileId);
}

/** Default cinematography profile ID */
export const DEFAULT_CINEMATOGRAPHY_PROFILE_ID = 'classic-cinematic';

/**
 * Builds cinematography profile guidance for AI calibration.
 * Injected into the system prompt as the default baseline for shot-level controls.
 */
export function buildCinematographyGuidance(profileId: string): string {
  const profile = getCinematographyProfile(profileId);
  if (!profile) return '';

  const { defaultLighting, defaultFocus, defaultRig, defaultAtmosphere, defaultSpeed } = profile;

  const lines = [
    `Cinematography profile: ${profile.nameEn || profile.name}`,
    `${profile.description}`,
    '',
    '**Default cinematography baseline. Each shot may deviate when the story requires it, but the reason should be clear:**',
    `Lighting: ${defaultLighting.style} style + ${defaultLighting.direction} direction + ${defaultLighting.colorTemperature} color temperature`,
    `Focus: ${defaultFocus.depthOfField} depth of field + ${defaultFocus.focusTransition} focus transition`,
    `Camera rig: ${defaultRig.cameraRig} + ${defaultRig.movementSpeed} movement speed`,
    defaultAtmosphere.effects.length > 0
      ? `Atmosphere: ${defaultAtmosphere.effects.join('+')} (${defaultAtmosphere.intensity})`
      : 'Atmosphere: no special atmospheric effects',
    `Speed: ${defaultSpeed.playbackSpeed}`,
    profile.defaultAngle ? `Camera angle: ${profile.defaultAngle}` : '',
    profile.defaultFocalLength ? `Focal length: ${profile.defaultFocalLength}` : '',
    profile.defaultTechnique ? `Photography technique: ${profile.defaultTechnique}` : '',
    '',
    `**Cinematography guidance:** ${profile.promptGuidance}`,
    '',
    `**Reference films:** ${profile.referenceFilms.join(', ')}`,
    '',
    'This is the project cinematography baseline. Shot-level camera controls should default to it, but may deviate when the story function requires a clear narrative reason.',
  ].filter(Boolean);

  return lines.join('\n');
}
