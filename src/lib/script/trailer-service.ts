// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
/**
 * Trailer Service - AI trailer shot selection service
 *
 * Function: intelligently pick the most compelling shots from the existing shot list to create a trailer
 * Selection criteria:
 * - Prioritize shots with "climax / turning point" narrative function
 * - Prioritize shots with strong emotion tags
 * - Prioritize visually striking scenes
 * - Prioritize shots where key characters appear
 */

import type { Shot, ProjectBackground } from '@/types/script';
import type { SplitScene, TrailerDuration } from '@/stores/director-store';
import { callFeatureAPI } from '@/lib/ai/feature-router';

// Shot counts per trailer duration
const DURATION_TO_SHOT_COUNT: Record<TrailerDuration, number> = {
  10: 2,   // 10 seconds: 2-3 shots
  30: 6,   // 30 seconds: 5-6 shots
  60: 12,  // 1 minute: 10-12 shots
};

/** @deprecated No longer needs to be passed manually; resolved automatically from service mapping. */
export interface TrailerGenerationOptions {
  apiKey?: string;
  provider?: string;
  baseUrl?: string;
}

export interface TrailerGenerationResult {
  success: boolean;
  selectedShots: Shot[];
  shotIds: string[];
  error?: string;
}

/**
 * AI trailer shot selection
 *
 * @param shots All available shots
 * @param background Project background
 * @param duration Trailer duration
 * @param options API configuration
 */
export async function selectTrailerShots(
  shots: Shot[],
  background: ProjectBackground | null,
  duration: TrailerDuration,
  _options?: TrailerGenerationOptions // Kept for backward compatibility; no longer needed.
): Promise<TrailerGenerationResult> {
  if (shots.length === 0) {
    return {
      success: false,
      selectedShots: [],
      shotIds: [],
      error: 'No shots are available.',
    };
  }

  const targetCount = DURATION_TO_SHOT_COUNT[duration];
  
  // If we have fewer shots than the target count, return them all.
  if (shots.length <= targetCount) {
    return {
      success: true,
      selectedShots: shots,
      shotIds: shots.map(s => s.id),
    };
  }

  try {
    // Build shot summaries for AI analysis
    const shotSummaries = shots.map((shot, index) => ({
      index: index + 1,
      id: shot.id,
      episodeId: shot.episodeId,
      actionSummary: shot.actionSummary || '',
      visualDescription: shot.visualDescription || '',
      dialogue: shot.dialogue || '',
      characterNames: shot.characterNames || [],
      narrativeFunction: (shot as any).narrativeFunction || '',
      emotionTags: (shot as any).emotionTags || [],
      shotSize: shot.shotSize || '',
    }));

    const systemPrompt = `你是一位专业的电影预告片剪辑师，擅长从大量素材中挑选最具吸引力的镜头来制作预告片。

你的任务是从给定的分镜列表中挑选出最适合做预告片的 ${targetCount} 个分镜。

【预告片结构原则】
1. **开场**：建立氛围，吸引注意（1-2个镜头）
2. **冲突升级**：展示故事的核心冲突（2-4个镜头）
3. **高潮悬念**：最具张力的画面，留下悬念（1-2个镜头）

【挑选标准】
- 优先选择叙事功能为"高潮"、"转折"、"冲突"的镜头
- 优先选择有强烈情绪（tense, excited, mysterious）的镜头
- 优先选择有视觉冲击力的画面（动作场面、特写、对峙）
- 优先选择主要角色出场的关键时刻
- 覆盖不同集数，展示故事跨度
- 避免剧透关键结局

【输出要求】
请返回一个 JSON 数组，包含你挑选的分镜序号（index），按预告片播放顺序排列。
格式：{ "selectedIndices": [1, 5, 12, 23, 45, 60] }`;

    const userPrompt = `【项目信息】
${background?.title ? `剧名：《${background.title}》` : ''}
${background?.outline ? `大纲：${background.outline.slice(0, 500)}` : ''}

【分镜列表】（共 ${shots.length} 个分镜）
${shotSummaries.map(s => 
  `[${s.index}] ${s.id}
   动作：${s.actionSummary.slice(0, 100)}
   描述：${s.visualDescription.slice(0, 100)}
   角色：${s.characterNames.join('、') || '无'}
   Narrative function: ${s.narrativeFunction || 'Unknown'}
   情绪：${Array.isArray(s.emotionTags) ? s.emotionTags.join(', ') : '无'}`
).join('\n\n')}

请从以上分镜中挑选 ${targetCount} 个最适合做预告片的镜头，返回 JSON 格式的序号列表。`;

    // Resolve configuration from service mapping.
    const result = await callFeatureAPI('script_analysis', systemPrompt, userPrompt);

    // Parse the AI response JSON - support multiple formats
    let selectedIndices: number[] = [];
    
    console.log('[TrailerService] AI raw response (first 1000 chars):', result.slice(0, 1000));
    
    // Try matching the { "selectedIndices": [...] } format
    const jsonMatch = result.match(/\{[\s\S]*?"selectedIndices"\s*:\s*\[[\d,\s]*\][\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        selectedIndices = parsed.selectedIndices || [];
      } catch (e) {
        console.warn('[TrailerService] Failed to parse JSON match:', e);
      }
    }
    
    // If that fails, try matching a plain number array [1, 2, 3, ...]
    if (selectedIndices.length === 0) {
      const arrayMatch = result.match(/\[\s*\d+(?:\s*,\s*\d+)*\s*\]/);
      if (arrayMatch) {
        try {
          selectedIndices = JSON.parse(arrayMatch[0]);
        } catch (e) {
        console.warn('[TrailerService] Failed to parse array match:', e);
        }
      }
    }
    
    // If that still fails, extract all numbers
    if (selectedIndices.length === 0) {
      const numbers = result.match(/\b(\d{1,3})\b/g);
      if (numbers) {
        selectedIndices = numbers
          .map(n => parseInt(n, 10))
          .filter(n => n >= 1 && n <= shots.length)
          .slice(0, targetCount);
      }
    }
    
    if (selectedIndices.length === 0) {
      throw new Error('AI returned an invalid format; could not parse the selected indices.');
    }
    
    console.log('[TrailerService] Parsed selectedIndices:', selectedIndices);

    // Resolve the selected shots by index
    const selectedShots = selectedIndices
      .filter(idx => idx >= 1 && idx <= shots.length)
      .map(idx => shots[idx - 1]);

    return {
      success: true,
      selectedShots,
      shotIds: selectedShots.map(s => s.id),
    };
  } catch (error) {
    console.error('[TrailerService] AI selection failed:', error);
    
    // Fallback: select shots by rules
    const fallbackShots = selectTrailerShotsByRules(shots, targetCount);
    return {
      success: true,
      selectedShots: fallbackShots,
      shotIds: fallbackShots.map(s => s.id),
      error: 'AI selection failed; falling back to rule-based selection.',
    };
  }
}

/**
 * Rule-based selection (fallback when AI selection fails)
 */
function selectTrailerShotsByRules(shots: Shot[], targetCount: number): Shot[] {
  // Scoring function
  const scoreShot = (shot: Shot): number => {
    let score = 0;
    
    // Narrative function score
    const narrativeFunction = (shot as any).narrativeFunction || '';
    if (narrativeFunction.includes('高潮')) score += 10;
    if (narrativeFunction.includes('转折')) score += 8;
    if (narrativeFunction.includes('冲突')) score += 6;
    if (narrativeFunction.includes('升级')) score += 4;
    
    // Emotion score
    const emotionTags = (shot as any).emotionTags || [];
    if (emotionTags.includes('tense')) score += 5;
    if (emotionTags.includes('excited')) score += 5;
    if (emotionTags.includes('mysterious')) score += 4;
    if (emotionTags.includes('touching')) score += 3;
    
    // Shots with dialogue are more compelling
    if (shot.dialogue) score += 2;
    
    // Shots with multiple characters are more dramatic
    if (shot.characterNames && shot.characterNames.length >= 2) score += 2;
    
    return score;
  };

  // Sort by score
  const scoredShots = shots.map(shot => ({
    shot,
    score: scoreShot(shot),
  })).sort((a, b) => b.score - a.score);

  // Evenly sample from different episodes
  const episodeIds = shots.map(s => s.episodeId).filter((id): id is string => !!id);
  const episodeSet = new Set(episodeIds);
  const episodeCount = episodeSet.size;
  
  if (episodeCount > 1) {
    // Multi-episode: pick a subset from each episode
    const perEpisode = Math.ceil(targetCount / episodeCount);
    const selected: Shot[] = [];
    const episodeSelected = new Map<string, number>();
    
    for (const { shot } of scoredShots) {
      const epId = shot.episodeId || 'default';
      const count = episodeSelected.get(epId) || 0;
      
      if (count < perEpisode && selected.length < targetCount) {
        selected.push(shot);
        episodeSelected.set(epId, count + 1);
      }
    }
    
    // Keep original order (trailers follow the timeline)
    return selected.sort((a, b) => {
      const idxA = shots.findIndex(s => s.id === a.id);
      const idxB = shots.findIndex(s => s.id === b.id);
      return idxA - idxB;
    });
  } else {
    // Single episode: just take the highest-scoring shots
    return scoredShots.slice(0, targetCount).map(s => s.shot);
  }
}

/**
 * Convert selected shots to SplitScene format (for AI Director storyboard editing)
 */
export function convertShotsToSplitScenes(
  shots: Shot[],
  sceneName?: string
): SplitScene[] {
  return shots.map((shot, index) => ({
    id: index,
    sceneName: sceneName || `Trailer #${index + 1}`,
    sceneLocation: '',
    imageDataUrl: '',
    imageHttpUrl: null,
    width: 0,
    height: 0,
    imagePrompt: shot.imagePrompt || shot.visualPrompt || '',
    imagePromptZh: shot.imagePromptZh || shot.visualDescription || '',
    videoPrompt: shot.videoPrompt || '',
    videoPromptZh: shot.videoPromptZh || '',
    endFramePrompt: shot.endFramePrompt || '',
    endFramePromptZh: shot.endFramePromptZh || '',
    needsEndFrame: shot.needsEndFrame || false,
    row: 0,
    col: index,
    sourceRect: { x: 0, y: 0, width: 0, height: 0 },
    endFrameImageUrl: null,
    endFrameHttpUrl: null,
    endFrameSource: null,
    characterIds: [],
    emotionTags: (shot.emotionTags || []) as any,
    shotSize: shot.shotSize as any || null,
    // Seedance 1.5 Pro requires 4-12 seconds, so we clamp the range
    duration: Math.max(4, Math.min(12, shot.duration || 5)),
    ambientSound: shot.ambientSound || '',
    soundEffects: [],
    soundEffectText: shot.soundEffect || '',
    dialogue: shot.dialogue || '',
    actionSummary: shot.actionSummary || '',
    cameraMovement: shot.cameraMovement || '',
    // Narrative-driven fields
    narrativeFunction: (shot as any).narrativeFunction || '',
    shotPurpose: (shot as any).shotPurpose || '',
    visualFocus: (shot as any).visualFocus || '',
    cameraPosition: (shot as any).cameraPosition || '',
    characterBlocking: (shot as any).characterBlocking || '',
    rhythm: (shot as any).rhythm || '',
    visualDescription: shot.visualDescription || '',
    // Lighting
    lightingStyle: shot.lightingStyle,
    lightingDirection: shot.lightingDirection,
    colorTemperature: shot.colorTemperature,
    lightingNotes: shot.lightingNotes,
    // Focus
    depthOfField: shot.depthOfField,
    focusTarget: shot.focusTarget,
    focusTransition: shot.focusTransition,
    // Equipment
    cameraRig: shot.cameraRig,
    movementSpeed: shot.movementSpeed,
    // Effects
    atmosphericEffects: shot.atmosphericEffects,
    effectIntensity: shot.effectIntensity,
    // Speed control
    playbackSpeed: shot.playbackSpeed,
    // Continuity
    continuityRef: shot.continuityRef,
    imageStatus: 'idle' as const,
    imageProgress: 0,
    imageError: null,
    videoStatus: 'idle' as const,
    videoProgress: 0,
    videoUrl: null,
    videoError: null,
    videoMediaId: null,
    endFrameStatus: 'idle' as const,
    endFrameProgress: 0,
    endFrameError: null,
  }));
}
