// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * S级「组级 AI 校准」核心模块
 *
 * 功能：
 * 1. 读取组内各 SplitScene 数据（只读，不修改 director-store）
 * 2. 调用 LLM 生成组级叙事弧线、镜头过渡、音频设计、优化 prompt
 * 3. 写入 sclass-store 的 ShotGroup 校准字段
 *
 * 数据安全：
 * - 只读 director-store，零污染原始剧本数据
 * - 产物只写 sclass-store.ShotGroup 的校准字段
 */

import type { SplitScene } from '@/stores/director-store';
import type { ShotGroup } from '@/stores/sclass-store';
import type { Character } from '@/stores/character-library-store';
import type { Scene } from '@/stores/scene-store';
import { callFeatureAPI } from '@/lib/ai/feature-router';
import { useSClassStore } from '@/stores/sclass-store';

// ==================== 类型定义 ====================

/** 校准产物（AI 输出的 4 项组级优化数据） */
export interface CalibrationResult {
  /** 组级叙事弧线描述 */
  narrativeArc: string;
  /** 镜头间过渡指令（长度 = scenes.length - 1） */
  transitions: string[];
  /** 组级音频设计（整段 15s 规划） */
  groupAudioDesign: string;
  /** AI 优化后的组级 prompt */
  calibratedPrompt: string;
}

// ==================== 内部工具 ====================

/**
 * 从 SplitScene 提取摘要信息（用于构建 AI 输入，不泄漏多余字段）
 */
function summarizeScene(scene: SplitScene, characters: Character[]): string {
  const charNames = (scene.characterIds || [])
    .map(id => characters.find(c => c.id === id)?.name)
    .filter(Boolean)
    .join('、');

  const parts: string[] = [];
  parts.push(`Scene: ${scene.sceneName || 'Untitled'}`);
  if (scene.sceneLocation) parts.push(`Location: ${scene.sceneLocation}`);
  parts.push(`Duration: ${scene.duration || 5}s`);
  if (charNames) parts.push(`Characters: ${charNames}`);
  if (scene.actionSummary) parts.push(`Action: ${scene.actionSummary}`);
  if (scene.cameraMovement) parts.push(`Camera movement: ${scene.cameraMovement}`);
  if (scene.dialogue) parts.push(`Dialogue: ${scene.dialogue}`);
  if (scene.ambientSound) parts.push(`Ambient sound: ${scene.ambientSound}`);
  if (scene.soundEffectText) parts.push(`Sound effects: ${scene.soundEffectText}`);
  if (scene.emotionTags?.length) parts.push(`Mood: ${scene.emotionTags.join(', ')}`);
  if (scene.narrativeFunction) parts.push(`Narrative function: ${scene.narrativeFunction}`);

  return parts.join('\n  ');
}

// ==================== 核心函数 ====================

/**
 * 校准单个组
 *
 * @param group       目标组（只读 sceneIds）
 * @param scenes      组内 SplitScene[]（只读，来自 director-store）
 * @param characters  角色库（用于名称映射）
 * @param sceneLibrary 场景库（备用上下文）
 * @returns CalibrationResult
 */
export async function calibrateGroup(
  group: ShotGroup,
  scenes: SplitScene[],
  characters: Character[],
  _sceneLibrary: Scene[],
): Promise<CalibrationResult> {
  if (scenes.length === 0) {
    throw new Error('No shots in the group, cannot calibrate');
  }

  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 5), 0);

  // ---- 构建输入 ----
  const sceneSummaries = scenes.map((s, i) =>
    `[Shot ${i + 1}]\n  ${summarizeScene(s, characters)}`
  ).join('\n\n');

  const systemPrompt = `You are a senior film director and editor specializing in pacing, continuity, and multi-shot narrative video.

[Core constraints - follow exactly]
1. Base every decision strictly on the shot data below. Do not add characters, locations, or dialogue that are not in the script.
2. Improve narrative continuity and transitions only. Do not change each shot's core content or emotional tone.
3. Preserve each shot's existing camera movement and action design. Add transition guidance only between shots.
4. Audio design must be based on the existing ambient sound and sound effect details. Do not invent new sound sources.
5. calibratedPrompt must combine all shots into one complete group-level prompt without omitting any shot.

Return JSON only. Do not include explanations outside the JSON. All returned text values must be in English.`;

  const userPrompt = `[Group info]
Group name: ${group.name}
Shot count: ${scenes.length}
Total duration: ${totalDuration}s

${sceneSummaries}

Return this JSON:
{
  "narrativeArc": "Describe the narrative arc of this shot group in one concise English sentence.",
  "transitions": [
    "Transition guidance from Shot 1 to Shot 2, such as dissolve, hard cut, or audio bridge."
  ],
  "groupAudioDesign": "Audio design plan for the full ${totalDuration}s segment, including ambient layers, sound-effect timing, and emotional curve.",
  "calibratedPrompt": "Complete optimized English group-level prompt for Seedance 2.0 multi-shot narrative video generation."
}

The transitions array must contain exactly ${scenes.length - 1} item(s), one for each adjacent shot pair.
calibratedPrompt must cover all ${scenes.length} shots and preserve shot numbering and timeline order.`;

  // ---- 调用 LLM ----
  const raw = await callFeatureAPI('script_analysis', systemPrompt, userPrompt, {
    temperature: 0.3, // 低温度确保稳定输出
    maxTokens: 4096,
  });

  // ---- 解析 JSON ----
  let cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse the JSON returned by AI. Please try again');
  }

  // ---- 校验 & 容错 ----
  const result: CalibrationResult = {
    narrativeArc: typeof parsed.narrativeArc === 'string' ? parsed.narrativeArc : '',
    transitions: Array.isArray(parsed.transitions) ? parsed.transitions.map(String) : [],
    groupAudioDesign: typeof parsed.groupAudioDesign === 'string' ? parsed.groupAudioDesign : '',
    calibratedPrompt: typeof parsed.calibratedPrompt === 'string' ? parsed.calibratedPrompt : '',
  };

  // transitions 长度修正
  const expectedLen = Math.max(scenes.length - 1, 0);
  if (result.transitions.length > expectedLen) {
    result.transitions = result.transitions.slice(0, expectedLen);
  }
  while (result.transitions.length < expectedLen) {
    result.transitions.push('Natural transition');
  }

  if (!result.calibratedPrompt) {
    throw new Error('AI did not return a valid calibratedPrompt');
  }

  return result;
}

// ==================== Store 写入 ====================

/**
 * 执行校准并写入 store
 *
 * 这是 UI 层应该调用的入口。处理状态更新和错误。
 */
export async function runCalibration(
  groupId: string,
  scenes: SplitScene[],
  characters: Character[],
  sceneLibrary: Scene[],
): Promise<boolean> {
  const store = useSClassStore.getState();
  const projectData = store.activeProjectId
    ? store.getProjectData(store.activeProjectId)
    : null;
  const group = projectData?.shotGroups.find(g => g.id === groupId);
  if (!group) {
    console.error('[SClassCalibrator] 找不到组:', groupId);
    return false;
  }

  // 标记校准中
  store.updateShotGroup(groupId, {
    calibrationStatus: 'calibrating',
    calibrationError: null,
  });

  try {
    const result = await calibrateGroup(group, scenes, characters, sceneLibrary);

    // 写入校准产物
    store.updateShotGroup(groupId, {
      narrativeArc: result.narrativeArc,
      transitions: result.transitions,
      groupAudioDesign: result.groupAudioDesign,
      calibratedPrompt: result.calibratedPrompt,
      calibrationStatus: 'done',
      calibrationError: null,
    });

    console.log(`[SClassCalibrator] ✅ 组「${group.name}」校准完成`);
    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[SClassCalibrator] ❌ 组「${group.name}」校准失败:`, errMsg);

    store.updateShotGroup(groupId, {
      calibrationStatus: 'failed',
      calibrationError: errMsg,
    });

    return false;
  }
}

/**
 * 批量校准所有未校准的组
 *
 * @returns 成功数 / 总数
 */
export async function runBatchCalibration(
  scenes: SplitScene[],
  characters: Character[],
  sceneLibrary: Scene[],
): Promise<{ success: number; total: number }> {
  const store = useSClassStore.getState();
  const projectData = store.activeProjectId
    ? store.getProjectData(store.activeProjectId)
    : null;

  if (!projectData) return { success: 0, total: 0 };

  // 筛选需要校准的组（未校准 或 校准失败）
  const groups = projectData.shotGroups.filter(g =>
    !g.calibrationStatus || g.calibrationStatus === 'idle' || g.calibrationStatus === 'failed'
  );

  let success = 0;
  for (const group of groups) {
    const groupScenes = scenes.filter(s => group.sceneIds.includes(s.id));
    if (groupScenes.length === 0) continue;

    const ok = await runCalibration(group.id, groupScenes, characters, sceneLibrary);
    if (ok) success++;
  }

  return { success, total: groups.length };
}
