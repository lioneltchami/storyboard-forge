// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * Property Panel Component
 * 右栏：选中项属性 + 跳转操作 + 编辑功能
 */

import { useState, useEffect } from "react";
import type { ScriptCharacter, ScriptScene, Shot, CompletionStatus, Episode, EpisodeRawScript } from "@/types/script";
import { getShotCompletionStatus } from "@/lib/script/shot-utils";
import { useActiveScriptProject } from "@/stores/script-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMERA_MOVEMENT_PRESETS, SPECIAL_TECHNIQUE_PRESETS } from "@/stores/director-presets";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  MapPin,
  Film,
  ArrowRight,
  Circle,
  Clock,
  CheckCircle2,
  Camera,
  MessageSquare,
  Pencil,
  Save,
  X,
  Trash2,
  Volume2,
  Sparkles,
  Timer,
  BookOpen,
  ListChecks,
  Clapperboard,
  Copy,
  Check,
  Grid3X3,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generateMultiPageContactSheetData } from "@/lib/script/scene-viewpoint-generator";
import type { PendingViewpointData, ContactSheetPromptSet } from "@/stores/media-panel-store";

// 状态徽章
function StatusBadge({ status }: { status?: CompletionStatus }) {
  const config = {
    pending: { label: "Not started", className: "bg-muted text-muted-foreground" },
    in_progress: { label: "In progress", className: "bg-yellow-500/10 text-yellow-600" },
    completed: { label: "Completed", className: "bg-green-500/10 text-green-600" },
  };
  const { label, className } = config[status || "pending"];
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${className}`}>
      {label}
    </span>
  );
}

// 集的详细信息
interface EpisodeDetail extends Episode {
  synopsis?: string;
  keyEvents?: string[];
  scenes: Array<{ sceneHeader: string; characters: string[] }>;
  shotGenerationStatus: 'idle' | 'generating' | 'completed' | 'error';
}

interface PropertyPanelProps {
  selectedItemId: string | null;
  selectedItemType: "character" | "scene" | "shot" | "episode" | null;
  character?: ScriptCharacter;
  scene?: ScriptScene;
  shot?: Shot;
  episode?: EpisodeDetail;  // 集信息
  episodeShots?: Shot[];    // 该集的所有分镜
  sceneShots?: Shot[];      // 该场景的所有分镜（用于多视角分析）
  onGoToCharacterLibrary?: (characterId: string) => void;
  onGoToSceneLibrary?: (sceneId: string) => void;
  onGoToDirector?: (shotId: string) => void;
  onGoToDirectorFromScene?: (sceneId: string) => void; // 场景级别跳转
  onGenerateEpisodeShots?: (episodeIndex: number) => void; // 生成分镜
  onCalibrateShots?: (episodeIndex: number) => void;  // 校准分镜
  // Edit callbacks
  onUpdateCharacter?: (id: string, updates: Partial<ScriptCharacter>) => void;
  onUpdateScene?: (id: string, updates: Partial<ScriptScene>) => void;
  onUpdateShot?: (id: string, updates: Partial<Shot>) => void;
  onDeleteCharacter?: (id: string) => void;
  onDeleteScene?: (id: string) => void;
  onDeleteShot?: (id: string) => void;
  // 角色阶段分析
  onAnalyzeCharacterStages?: () => void;
  stageAnalysisStatus?: 'idle' | 'analyzing' | 'completed' | 'error';
  suggestMultiStage?: boolean;
  multiStageHints?: string[];
}

export function PropertyPanel({
  selectedItemId,
  selectedItemType,
  character,
  scene,
  shot,
  episode,
  episodeShots = [],
  sceneShots = [],
  onGoToCharacterLibrary,
  onGoToSceneLibrary,
  onGoToDirector,
  onGoToDirectorFromScene,
  onGenerateEpisodeShots,
  onCalibrateShots,
  onUpdateCharacter,
  onUpdateScene,
  onUpdateShot,
  onDeleteCharacter,
  onDeleteScene,
  onDeleteShot,
  onAnalyzeCharacterStages,
  stageAnalysisStatus,
  suggestMultiStage,
  multiStageHints,
}: PropertyPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [copiedCharacter, setCopiedCharacter] = useState(false);
  const [copiedShotPrompts, setCopiedShotPrompts] = useState(false);
  const [copiedScene, setCopiedScene] = useState(false);
  const scriptProject = useActiveScriptProject();
  const promptLanguage = scriptProject?.promptLanguage || 'en';

  // 复制场景数据
  const handleCopySceneData = async () => {
    if (!scene) return;

    const lines: string[] = [];
    lines.push(`# Scene setup: ${scene.name || scene.location}`);
    lines.push('');

    // Basic info
    lines.push(`## Basic info`);
    lines.push(`Location: ${scene.location}`);
    if (scene.time) lines.push(`Time: ${scene.time}`);
    if (scene.atmosphere) lines.push(`Atmosphere: ${scene.atmosphere}`);
    lines.push('');

    // Scene design (after AI calibration)
    if (scene.architectureStyle || scene.lightingDesign || scene.colorPalette || scene.eraDetails) {
      lines.push(`## Scene design`);
      if (scene.architectureStyle) lines.push(`Architecture style: ${scene.architectureStyle}`);
      if (scene.lightingDesign) lines.push(`Lighting design: ${scene.lightingDesign}`);
      if (scene.colorPalette) lines.push(`Color palette: ${scene.colorPalette}`);
      if (scene.eraDetails) lines.push(`Era details: ${scene.eraDetails}`);
      if (scene.keyProps && scene.keyProps.length > 0) lines.push(`Key props: ${scene.keyProps.join('、')}`);
      if (scene.spatialLayout) lines.push(`Spatial layout: ${scene.spatialLayout}`);
      lines.push('');
    }

    // Visual prompt (displayed according to prompt language)
    const includeZhScenePrompt = promptLanguage !== 'en';
    const includeEnScenePrompt = promptLanguage !== 'zh';
    if ((includeZhScenePrompt && scene.visualPrompt) || (includeEnScenePrompt && scene.visualPromptEn)) {
      lines.push(`## Visual prompt`);
      if (includeZhScenePrompt && scene.visualPrompt) lines.push(`Chinese: ${scene.visualPrompt}`);
      if (includeEnScenePrompt && scene.visualPromptEn) lines.push(`English: ${scene.visualPromptEn}`);
      lines.push('');
    }

    // Multi-view contact sheet (output from AI viewpoint analysis)
    if (scene.viewpoints && scene.viewpoints.length > 0) {
      lines.push(`## Multi-view contact sheet (AI analysis)`);
      lines.push(`Viewpoint count: ${scene.viewpoints.length}`);
      lines.push('');
      scene.viewpoints.forEach((vp, idx) => {
        lines.push(`### Viewpoint ${idx + 1}: ${promptLanguage === 'en' ? vp.nameEn || vp.name : vp.name || vp.nameEn}`);
        lines.push(`- ID: ${vp.id}`);
        if (vp.nameEn) lines.push(`- English name: ${vp.nameEn}`);
        if (vp.keyProps && vp.keyProps.length > 0) lines.push(`- Key props: ${vp.keyProps.join('、')}`);
        if (vp.shotIds && vp.shotIds.length > 0) lines.push(`- Linked shot IDs: ${vp.shotIds.join(', ')}`);
        lines.push(`- Grid position: ${vp.gridIndex}`);
        lines.push('');
      });
    }

    // Appearance stats
    if (scene.importance || scene.appearanceCount || scene.episodeNumbers?.length) {
      lines.push(`## Appearance stats`);
      if (scene.importance) {
        const importanceLabel = scene.importance === 'main' ? 'Main scene' :
                               scene.importance === 'secondary' ? 'Secondary scene' : 'Transition scene';
        lines.push(`Importance: ${importanceLabel}`);
      }
      if (scene.appearanceCount) lines.push(`Appearances: ${scene.appearanceCount}`);
      if (scene.episodeNumbers && scene.episodeNumbers.length > 0) {
        lines.push(`Episode numbers: ${scene.episodeNumbers.join(', ')}`);
      }
      lines.push('');
    }
    
    const text = lines.join('\n');
    
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScene(true);
      setTimeout(() => setCopiedScene(false), 2000);
    } catch (e) {
      console.error('Copy scene failed:', e);
    }
  };

  // 复制角色数据
  const handleCopyCharacterData = async () => {
    if (!character) return;

    // Format character data
    const lines: string[] = [];
    lines.push(`# Character setup: ${character.name}`);
    lines.push('');

    // Basic info (shown first)
    if (character.gender || character.age) {
      lines.push(`## Basic info`);
      const basicInfo: string[] = [];
      if (character.gender) basicInfo.push(`Gender: ${character.gender}`);
      if (character.age) basicInfo.push(`Age: ${character.age}`);
      lines.push(basicInfo.join(' | '));
      lines.push('');
    }

    // Identity / background (primary description)
    if (character.role) {
      lines.push(`## Identity / background`);
      lines.push(character.role);
      lines.push('');
    }

    // Personality traits
    if (character.personality) {
      lines.push(`## Personality traits`);
      lines.push(character.personality);
      lines.push('');
    }

    // Core traits
    if (character.traits) {
      lines.push(`## Core traits`);
      lines.push(character.traits);
      lines.push('');
    }

    // Appearance
    if (character.appearance) {
      lines.push(`## Appearance`);
      lines.push(character.appearance);
      lines.push('');
    }

    // Skills / abilities
    if (character.skills) {
      lines.push(`## Skills / abilities`);
      lines.push(character.skills);
      lines.push('');
    }

    // Key actions / events
    if (character.keyActions) {
      lines.push(`## Key actions / events`);
      lines.push(character.keyActions);
      lines.push('');
    }

    // Relationships
    if (character.relationships) {
      lines.push(`## Relationships`);
      lines.push(character.relationships);
      lines.push('');
    }

    // === Six-layer identity anchors (character consistency) ===
    if (character.identityAnchors) {
      const anchors = character.identityAnchors;
      lines.push(`## Six-layer identity anchors`);

      // 1. Bone structure layer
      const boneFeatures: string[] = [];
      if (anchors.faceShape) boneFeatures.push(`Face shape: ${anchors.faceShape}`);
      if (anchors.jawline) boneFeatures.push(`Jawline: ${anchors.jawline}`);
      if (anchors.cheekbones) boneFeatures.push(`Cheekbones: ${anchors.cheekbones}`);
      if (boneFeatures.length > 0) {
        lines.push(`1. Bone structure: ${boneFeatures.join(', ')}`);
      }

      // 2. Facial features layer
      const facialFeatures: string[] = [];
      if (anchors.eyeShape) facialFeatures.push(`Eye shape: ${anchors.eyeShape}`);
      if (anchors.eyeDetails) facialFeatures.push(`Eye details: ${anchors.eyeDetails}`);
      if (anchors.noseShape) facialFeatures.push(`Nose shape: ${anchors.noseShape}`);
      if (anchors.lipShape) facialFeatures.push(`Lip shape: ${anchors.lipShape}`);
      if (facialFeatures.length > 0) {
        lines.push(`2. Facial features: ${facialFeatures.join(', ')}`);
      }

      // 3. Distinctive marks layer (strongest anchor)
      if (anchors.uniqueMarks && anchors.uniqueMarks.length > 0) {
        lines.push(`3. Distinctive marks (strongest anchor): ${anchors.uniqueMarks.join('; ')}`);
      }

      // 4. Color anchor layer
      if (anchors.colorAnchors) {
        const colors: string[] = [];
        if (anchors.colorAnchors.iris) colors.push(`Iris: ${anchors.colorAnchors.iris}`);
        if (anchors.colorAnchors.hair) colors.push(`Hair color: ${anchors.colorAnchors.hair}`);
        if (anchors.colorAnchors.skin) colors.push(`Skin tone: ${anchors.colorAnchors.skin}`);
        if (anchors.colorAnchors.lips) colors.push(`Lip color: ${anchors.colorAnchors.lips}`);
        if (colors.length > 0) {
          lines.push(`4. Color anchors (Hex): ${colors.join(', ')}`);
        }
      }

      // 5. Skin texture layer
      if (anchors.skinTexture) {
        lines.push(`5. Skin texture: ${anchors.skinTexture}`);
      }

      // 6. Hairstyle anchor layer
      const hairFeatures: string[] = [];
      if (anchors.hairStyle) hairFeatures.push(`Hairstyle: ${anchors.hairStyle}`);
      if (anchors.hairlineDetails) hairFeatures.push(`Hairline: ${anchors.hairlineDetails}`);
      if (hairFeatures.length > 0) {
        lines.push(`6. Hairstyle anchor layer: ${hairFeatures.join(', ')}`);
      }

      lines.push('');
    }

    // === Negative prompts ===
    if (character.negativePrompt) {
      lines.push(`## Negative prompts`);
      if (character.negativePrompt.avoid && character.negativePrompt.avoid.length > 0) {
        lines.push(`Avoid: ${character.negativePrompt.avoid.join(', ')}`);
      }
      if (character.negativePrompt.styleExclusions && character.negativePrompt.styleExclusions.length > 0) {
        lines.push(`Style exclusions: ${character.negativePrompt.styleExclusions.join(', ')}`);
      }
      lines.push('');
    }

    // Character tags
    if (character.tags && character.tags.length > 0) {
      lines.push(`## Character tags`);
      lines.push(character.tags.map(t => `#${t}`).join(' '));
      lines.push('');
    }

    // Character notes
    if (character.notes) {
      lines.push(`## Character notes`);
      lines.push(character.notes);
      lines.push('');
    }
    
    const text = lines.join('\n');
    
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCharacter(true);
      setTimeout(() => setCopiedCharacter(false), 2000);
    } catch (e) {
      console.error('Copy character failed:', e);
    }
  };

  // 复制集分镜数据
  const handleCopyEpisodeShots = async () => {
    if (!episode || episodeShots.length === 0) return;

    // Emotion label mapping
    const emotionLabels: Record<string, string> = {
      happy: 'Happy', sad: 'Sad', angry: 'Angry', surprised: 'Surprised', fearful: 'Fearful', calm: 'Calm',
      tense: 'Tense', excited: 'Excited', mysterious: 'Mysterious', romantic: 'Romantic', funny: 'Funny', touching: 'Touching',
      serious: 'Serious', relaxed: 'Relaxed', playful: 'Playful', gentle: 'Gentle', passionate: 'Passionate', low: 'Low'
    };

    // Format shot data
    const lines: string[] = [];
    lines.push(`# Episode ${episode.index}: ${episode.title.replace(/^第\d+集[：:]?/, '')}`);
    lines.push('');
    if (episode.synopsis) {
      lines.push(`## Episode synopsis`);
      lines.push(episode.synopsis);
      lines.push('');
    }
    lines.push(`## Shot list (${episodeShots.length} total)`);
    lines.push('');

    episodeShots.forEach((s, idx) => {
      lines.push(`### Shot ${String(idx + 1).padStart(2, '0')}`);
      if (s.shotSize || s.cameraMovement) {
        lines.push(`**Shot**: ${[s.shotSize, s.cameraMovement].filter(Boolean).join(' | ')}`);
      }
      if ((s as any).visualDescription) {
        lines.push(`**Visual description**: ${(s as any).visualDescription}`);
      }
      if (s.actionSummary) {
        lines.push(`**Action**: ${s.actionSummary}`);
      }
      if (s.dialogue) {
        lines.push(`**Dialogue**: "${s.dialogue}"`);
      }
      if (s.characterNames && s.characterNames.length > 0) {
        lines.push(`**Characters**: ${s.characterNames.join('、')}`);
      }
      if (s.emotionTags && s.emotionTags.length > 0) {
        const tags = s.emotionTags.map(t => emotionLabels[t] || t).join('、');
        lines.push(`**Mood**: ${tags}`);
      }
      if (promptLanguage !== 'zh' && (s as any).visualPrompt) {
        lines.push(`**English prompt**: ${(s as any).visualPrompt}`);
      }
      // Three-layer prompt system
      if (s.imagePromptZh || s.imagePrompt) {
        if (promptLanguage === 'zh') {
          lines.push(`**First-frame prompt**: ${s.imagePromptZh || ''}`);
        } else if (promptLanguage === 'en') {
          lines.push(`**First-frame prompt**: ${s.imagePrompt || ''}`);
        } else {
          lines.push(`**First-frame prompt**: ${s.imagePromptZh || ''} ${s.imagePrompt ? `(English: ${s.imagePrompt})` : ''}`);
        }
      }
      if (s.videoPromptZh || s.videoPrompt) {
        if (promptLanguage === 'zh') {
          lines.push(`**Video prompt**: ${s.videoPromptZh || ''}`);
        } else if (promptLanguage === 'en') {
          lines.push(`**Video prompt**: ${s.videoPrompt || ''}`);
        } else {
          lines.push(`**Video prompt**: ${s.videoPromptZh || ''} ${s.videoPrompt ? `(English: ${s.videoPrompt})` : ''}`);
        }
      }
      if (s.needsEndFrame) {
        lines.push(`**Needs end frame**: Yes`);
        if (s.endFramePromptZh || s.endFramePrompt) {
          if (promptLanguage === 'zh') {
            lines.push(`**End-frame prompt**: ${s.endFramePromptZh || ''}`);
          } else if (promptLanguage === 'en') {
            lines.push(`**End-frame prompt**: ${s.endFramePrompt || ''}`);
          } else {
            lines.push(`**End-frame prompt**: ${s.endFramePromptZh || ''} ${s.endFramePrompt ? `(English: ${s.endFramePrompt})` : ''}`);
          }
        }
      }
      lines.push('');
    });
    
    const text = lines.join('\n');
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  // 复制当前分镜的三层提示词
  const handleCopyShotTriPrompts = async () => {
    if (!shot) return;

    const hasTri = !!(
      shot.imagePrompt || shot.imagePromptZh ||
      shot.videoPrompt || shot.videoPromptZh ||
      shot.endFramePrompt || shot.endFramePromptZh
    );

    // 景别中文映射
    const shotSizeLabels: Record<string, string> = {
      'ECU': 'Extreme close-up', 'CU': 'Close-up', 'MCU': 'Medium close-up', 'MS': 'Medium shot',
      'MLS': 'Medium long shot', 'LS': 'Long shot', 'ELS': 'Extreme long shot', 'POV': 'Point of view'
    };
    // Camera movement labels
    const cameraLabelsLegacy: Record<string, string> = {
      'Static': 'Static', 'Pan': 'Pan', 'Tilt': 'Tilt', 'Dolly': 'Dolly',
      'Zoom': 'Zoom', 'Tracking': 'Tracking', 'Crane': 'Crane', 'Handheld': 'Handheld'
    };
    const cameraLabels = (id: string) => {
      const preset = CAMERA_MOVEMENT_PRESETS.find(p => p.id === id);
      return preset ? preset.label : (cameraLabelsLegacy[id] || id);
    };
    const specialTechniqueLabel = (id: string) => {
      const preset = SPECIAL_TECHNIQUE_PRESETS.find(p => p.id === id);
      return preset ? preset.label : id;
    };

    const lines: string[] = [];
    lines.push('═══════════════════════════════════════');
    lines.push(`Shot ${shot.index} - Three-layer prompt data`);
    lines.push('═══════════════════════════════════════');
    lines.push('');

    // 基础信息
    lines.push('[Basic Info]');
    if (shot.shotSize) {
      lines.push(`Shot size: ${shotSizeLabels[shot.shotSize] || shot.shotSize} (${shot.shotSize})`);
    }
    if (shot.cameraMovement) {
      lines.push(`Camera movement: ${cameraLabels(shot.cameraMovement)}`);
    }
    if (shot.specialTechnique && shot.specialTechnique !== 'none') {
      lines.push(`Special technique: ${specialTechniqueLabel(shot.specialTechnique)}`);
    }
    if (shot.duration) {
      lines.push(`Duration: ${shot.duration}s`);
    }
    if (shot.characterNames && shot.characterNames.length > 0) {
      lines.push(`Characters: ${shot.characterNames.join(', ')}`);
    }
    // Always show the dialogue field so an empty value stays explicit.
    lines.push(`Dialogue: ${shot.dialogue ? `"${shot.dialogue}"` : 'None'}`);
    if (shot.actionSummary) {
      lines.push(`Action description: ${shot.actionSummary}`);
    }
    lines.push('');

    // Visual description
    if ((shot as any).visualDescription) {
      lines.push('[Visual Description]');
      lines.push((shot as any).visualDescription);
      lines.push('');
    }

    // Audio design
    if (shot.ambientSound || shot.soundEffect) {
      lines.push('[Audio Design]');
      if (shot.ambientSound) {
        lines.push(`Ambient sound: ${shot.ambientSound}`);
      }
      if (shot.soundEffect) {
        lines.push(`Sound effect: ${shot.soundEffect}`);
      }
      lines.push('');
    }

    // Narrative design (based on "The Grammar of Film Language")
    const hasNarrative = (shot as any).narrativeFunction || (shot as any).shotPurpose || 
                         (shot as any).visualFocus || (shot as any).cameraPosition || 
                         (shot as any).characterBlocking || (shot as any).rhythm;
    if (hasNarrative) {
      lines.push('[Narrative Design] Based on "The Grammar of Film Language"');
      if ((shot as any).narrativeFunction) {
        lines.push(`Narrative function: ${(shot as any).narrativeFunction}`);
      }
      if ((shot as any).shotPurpose) {
        lines.push(`Shot purpose: ${(shot as any).shotPurpose}`);
      }
      if ((shot as any).visualFocus) {
        lines.push(`Visual focus: ${(shot as any).visualFocus}`);
      }
      if ((shot as any).cameraPosition) {
        lines.push(`Camera position: ${(shot as any).cameraPosition}`);
      }
      if ((shot as any).characterBlocking) {
        lines.push(`Blocking: ${(shot as any).characterBlocking}`);
      }
      if ((shot as any).rhythm) {
        lines.push(`Rhythm: ${(shot as any).rhythm}`);
      }
      lines.push('');
    }

    if (!hasTri) {
      lines.push('⚠️ This shot has not generated tri-layer prompts yet. Please run "AI calibration for shot" first.');
    } else {
      // ===== First-frame prompt =====
      lines.push('───────────────────────────────────────');
      lines.push('[First-Frame Prompt] Used to generate the first frame image');
      lines.push('───────────────────────────────────────');
      if (promptLanguage !== 'en' && shot.imagePromptZh) {
        lines.push(`Chinese: ${shot.imagePromptZh}`);
      }
      if (promptLanguage !== 'zh' && shot.imagePrompt) {
        lines.push(`English: ${shot.imagePrompt}`);
      }
      if (
        (promptLanguage === 'zh' && !shot.imagePromptZh) ||
        (promptLanguage === 'en' && !shot.imagePrompt) ||
        (promptLanguage === 'zh+en' && !shot.imagePrompt && !shot.imagePromptZh)
      ) {
        lines.push('(Not generated)');
      }
      lines.push('');

      // ===== Video prompt =====
      lines.push('───────────────────────────────────────');
      lines.push('[Video Prompt] Used for image-to-video generation, describing motion and actions');
      lines.push('───────────────────────────────────────');
      if (promptLanguage !== 'en' && shot.videoPromptZh) {
        lines.push(`Chinese: ${shot.videoPromptZh}`);
      }
      if (promptLanguage !== 'zh' && shot.videoPrompt) {
        lines.push(`English: ${shot.videoPrompt}`);
      }
      if (
        (promptLanguage === 'zh' && !shot.videoPromptZh) ||
        (promptLanguage === 'en' && !shot.videoPrompt) ||
        (promptLanguage === 'zh+en' && !shot.videoPrompt && !shot.videoPromptZh)
      ) {
        lines.push('(Not generated)');
      }
      lines.push('');

      // ===== End-frame prompt =====
      lines.push('───────────────────────────────────────');
      lines.push('[End-Frame Prompt] Used to generate the last frame of the video (if needed)');
      lines.push('───────────────────────────────────────');
      if (shot.needsEndFrame) {
        lines.push('End frame required: Yes');
        if (promptLanguage !== 'en' && shot.endFramePromptZh) {
          lines.push(`Chinese: ${shot.endFramePromptZh}`);
        }
        if (promptLanguage !== 'zh' && shot.endFramePrompt) {
          lines.push(`English: ${shot.endFramePrompt}`);
        }
        if (
          (promptLanguage === 'zh' && !shot.endFramePromptZh) ||
          (promptLanguage === 'en' && !shot.endFramePrompt) ||
          (promptLanguage === 'zh+en' && !shot.endFramePrompt && !shot.endFramePromptZh)
        ) {
          lines.push('(Not generated)');
        }
      } else {
        lines.push('End frame required: No (this shot does not need a separate end frame)');
      }
    }

    lines.push('');
    lines.push('═══════════════════════════════════════');

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedShotPrompts(true);
      setTimeout(() => setCopiedShotPrompts(false), 2000);
    } catch (e) {
      console.error('Copy tri-layer prompts failed:', e);
    }
  };

  // Reset edit state when selection changes
  useEffect(() => {
    setIsEditing(false);
    setEditData({});
  }, [selectedItemId, selectedItemType]);

  // Initialize edit data
  const startEditing = () => {
    if (selectedItemType === "character" && character) {
      setEditData({
        name: character.name || "",
        gender: character.gender || "",
        age: character.age || "",
        personality: character.personality || "",
        role: character.role || "",
        traits: character.traits || "",
        skills: character.skills || "",
        keyActions: character.keyActions || "",
        appearance: character.appearance || "",
        relationships: character.relationships || "",
      });
    } else if (selectedItemType === "scene" && scene) {
      setEditData({
        name: scene.name || "",
        location: scene.location || "",
        time: scene.time || "",
        atmosphere: scene.atmosphere || "",
      });
    } else if (selectedItemType === "shot" && shot) {
      setEditData({
        actionSummary: shot.actionSummary || "",
        dialogue: shot.dialogue || "",
        shotSize: shot.shotSize || "",
        cameraMovement: shot.cameraMovement || "none",
        specialTechnique: shot.specialTechnique || "none",
      });
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    if (selectedItemType === "character" && character) {
      onUpdateCharacter?.(character.id, editData);
    } else if (selectedItemType === "scene" && scene) {
      onUpdateScene?.(scene.id, editData);
    } else if (selectedItemType === "shot" && shot) {
      onUpdateShot?.(shot.id, editData as any);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (selectedItemType === "character" && character) {
      onDeleteCharacter?.(character.id);
    } else if (selectedItemType === "scene" && scene) {
      onDeleteScene?.(scene.id);
    } else if (selectedItemType === "shot" && shot) {
      onDeleteShot?.(shot.id);
    }
    setDeleteDialogOpen(false);
  };

  if (!selectedItemId || !selectedItemType) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
        Select an episode, character, scene, or shot
        <br />
        to view details
      </div>
    );
  }

  // 集详情
  if (selectedItemType === "episode" && episode) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4 pb-32">
          {/* 头部 */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
              <Clapperboard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Episode {episode.index}</h3>
              <p className="text-sm text-muted-foreground">{episode.title.replace(/^第\d+集[：:]？/, '')}</p>
            </div>
          </div>

          <Separator />

          {/* 大纲 */}
          {episode.synopsis ? (
            <div className="bg-gradient-to-r from-primary/5 to-transparent p-3 rounded-lg border-l-2 border-primary/30">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Episode synopsis
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{episode.synopsis}</div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
              No synopsis yet. Click the button below to generate one.
            </div>
          )}

          {/* 关键事件 */}
          {episode.keyEvents && episode.keyEvents.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <ListChecks className="h-3 w-3" />
                Key events
              </div>
              <div className="space-y-1">
                {episode.keyEvents.map((event, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary font-medium">{i + 1}.</span>
                    <span>{event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 场景统计 */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="text-xs text-muted-foreground mb-2">Scene stats</div>
            <div className="text-sm">
              This episode has <span className="font-medium text-primary">{episode.scenes?.length || 0}</span> scenes
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Shot status: {episode.shotGenerationStatus === 'completed' ? '✅ Generated' :
                episode.shotGenerationStatus === 'generating' ? '⏳ Generating...' : '⏹ Not generated'}
            </div>
          </div>

          <Separator />

          {/* 操作 */}
          <div className="space-y-2">
            {episode.shotGenerationStatus !== 'completed' && (
              <Button
                className="w-full"
                onClick={() => onGenerateEpisodeShots?.(episode.index)}
                disabled={episode.shotGenerationStatus === 'generating'}
              >
                <Film className="h-4 w-4 mr-2" />
                Generate shots
              </Button>
            )}
            {episode.shotGenerationStatus === 'completed' && (
              <>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => onCalibrateShots?.(episode.index)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI calibrate shots
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCopyEpisodeShots}
                  disabled={episodeShots.length === 0}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy shot data ({episodeShots.length})
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </ScrollArea>
    );
  }

  // 角色详情
  if (selectedItemType === "character" && character) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4 pb-32">
          {/* 头部 */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editData.name || ""}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="h-7 text-sm font-medium"
                />
              ) : (
                <h3 className="font-medium">{character.name}</h3>
              )}
              <StatusBadge status={character.status} />
            </div>
            {!isEditing ? (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={startEditing}>
                <Pencil className="h-3 w-3" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSave}>
                  <Save className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsEditing(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* 属性 */}
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Identity / background</Label>
                <Textarea value={editData.role || ""} onChange={(e) => setEditData({ ...editData, role: e.target.value })} className="min-h-[60px]" placeholder="Detailed identity and background description" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Gender</Label>
                  <Input value={editData.gender || ""} onChange={(e) => setEditData({ ...editData, gender: e.target.value })} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Age</Label>
                  <Input value={editData.age || ""} onChange={(e) => setEditData({ ...editData, age: e.target.value })} className="h-8" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Personality</Label>
                <Textarea value={editData.personality || ""} onChange={(e) => setEditData({ ...editData, personality: e.target.value })} className="min-h-[60px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Core traits</Label>
                <Textarea value={editData.traits || ""} onChange={(e) => setEditData({ ...editData, traits: e.target.value })} className="min-h-[60px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Skills / abilities</Label>
                <Textarea value={editData.skills || ""} onChange={(e) => setEditData({ ...editData, skills: e.target.value })} className="min-h-[60px]" placeholder="Martial arts, magic, professional skills, etc." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Key actions / events</Label>
                <Textarea value={editData.keyActions || ""} onChange={(e) => setEditData({ ...editData, keyActions: e.target.value })} className="min-h-[60px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Appearance</Label>
                <Textarea value={editData.appearance || ""} onChange={(e) => setEditData({ ...editData, appearance: e.target.value })} className="min-h-[40px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Relationships</Label>
                <Textarea value={editData.relationships || ""} onChange={(e) => setEditData({ ...editData, relationships: e.target.value })} className="min-h-[40px]" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 阶段角色特殊信息 */}
              {character.stageInfo && (
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-1">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    🎭 Stage character: {character.stageInfo.stageName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Episodes: {character.stageInfo.episodeRange[0]}-{character.stageInfo.episodeRange[1]}
                  </div>
                  {character.stageInfo.ageDescription && (
                    <div className="text-xs text-muted-foreground">
                      Age: {character.stageInfo.ageDescription}
                    </div>
                  )}
                </div>
              )}
              
              {/* 视觉提示词（世界级大师生成） */}
              {((promptLanguage !== 'en' && character.visualPromptZh) || (promptLanguage !== 'zh' && character.visualPromptEn)) && (
                <div className="bg-gradient-to-r from-purple-500/10 to-transparent p-2 rounded-lg border-l-2 border-purple-500/30">
                  <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">🎨 Visual prompt</div>
                  {promptLanguage !== 'en' && character.visualPromptZh && (
                    <div className="text-xs text-muted-foreground mb-1">{character.visualPromptZh}</div>
                  )}
                  {promptLanguage !== 'zh' && character.visualPromptEn && (
                    <div className="text-xs text-muted-foreground/70 italic">{character.visualPromptEn}</div>
                  )}
                </div>
              )}
              
              {character.role && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Identity / background</div>
                  <div className="text-sm whitespace-pre-wrap">{character.role}</div>
                </div>
              )}
              {(character.gender || character.age) && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Basic info</div>
                  <div className="text-sm">
                    {[character.gender, character.age].filter(Boolean).join(" · ")}
                  </div>
                </div>
              )}
              {character.personality && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Personality</div>
                  <div className="text-sm whitespace-pre-wrap">{character.personality}</div>
                </div>
              )}
              {character.traits && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Core traits</div>
                  <div className="text-sm whitespace-pre-wrap">{character.traits}</div>
                </div>
              )}
              {character.skills && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Skills / abilities</div>
                  <div className="text-sm whitespace-pre-wrap">{character.skills}</div>
                </div>
              )}
              {character.keyActions && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Key actions / events</div>
                  <div className="text-sm whitespace-pre-wrap">{character.keyActions}</div>
                </div>
              )}
              {character.appearance && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Appearance</div>
                  <div className="text-sm whitespace-pre-wrap">{character.appearance}</div>
                </div>
              )}
              {character.relationships && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Relationships</div>
                  <div className="text-sm whitespace-pre-wrap">{character.relationships}</div>
                </div>
              )}
              {character.tags && character.tags.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Character tags</div>
                  <div className="flex flex-wrap gap-1">
                    {character.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {character.notes && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Character notes</div>
                  <div className="text-sm text-muted-foreground italic whitespace-pre-wrap">{character.notes}</div>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* 操作 */}
          <div className="space-y-2">
            {/* 父角色（有阶段角色）：显示提示，不显示生成按钮 */}
            {character.stageCharacterIds && character.stageCharacterIds.length > 0 ? (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-2">
                <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  Created {character.stageCharacterIds.length} stage versions
                </div>
                <div className="text-xs text-muted-foreground">
                  Click a stage version in the middle panel (for example, "{character.name} (young version)"), then go to the character library to generate its look
                </div>
              </div>
            ) : (
              /* 普通角色或阶段角色：显示生成按钮 */
              <Button
                className="w-full"
                onClick={() => onGoToCharacterLibrary?.(character.id)}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {character.characterLibraryId ? 'View character library look' : 'Go to character library'}
              </Button>
            )}
            
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopyCharacterData}
            >
              {copiedCharacter ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy character data
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete character
            </Button>
          </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm delete</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete character "{character.name}"?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ScrollArea>
    );
  }

  // 场景详情
  if (selectedItemType === "scene" && scene) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4 pb-32">
          {/* 头部 */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
              <MapPin className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editData.name || ""}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="h-7 text-sm font-medium"
                />
              ) : (
                <h3 className="font-medium">{scene.name || scene.location}</h3>
              )}
              <StatusBadge status={scene.status} />
            </div>
            {!isEditing ? (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={startEditing}>
                <Pencil className="h-3 w-3" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSave}>
                  <Save className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsEditing(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* 属性 */}
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Location</Label>
                <Input value={editData.location || ""} onChange={(e) => setEditData({ ...editData, location: e.target.value })} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Time</Label>
                <Input value={editData.time || ""} onChange={(e) => setEditData({ ...editData, time: e.target.value })} className="h-8" placeholder="For example: day, night, dusk" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Atmosphere</Label>
                <Textarea value={editData.atmosphere || ""} onChange={(e) => setEditData({ ...editData, atmosphere: e.target.value })} className="min-h-[60px]" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 基础信息 */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Location</div>
                <div className="text-sm">{scene.location}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Time</div>
                <div className="text-sm">{scene.time}</div>
              </div>
              {scene.atmosphere && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Atmosphere</div>
                  <div className="text-sm">{scene.atmosphere}</div>
                </div>
              )}
              
              {/* 专业场景设计字段（AI校准后显示） */}
              {(scene.architectureStyle || scene.lightingDesign || scene.colorPalette || scene.eraDetails) && (
                <>
                  <Separator className="my-2" />
                  <div className="text-xs font-medium text-primary mb-2">Scene design</div>
                  
                  {scene.architectureStyle && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Architecture style</div>
                      <div className="text-sm">{scene.architectureStyle}</div>
                    </div>
                  )}
                  {scene.lightingDesign && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Lighting design</div>
                      <div className="text-sm">{scene.lightingDesign}</div>
                    </div>
                  )}
                  {scene.colorPalette && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Color palette</div>
                      <div className="text-sm">{scene.colorPalette}</div>
                    </div>
                  )}
                  {scene.eraDetails && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Era details</div>
                      <div className="text-sm">{scene.eraDetails}</div>
                    </div>
                  )}
                  {scene.keyProps && scene.keyProps.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Key props</div>
                      <div className="text-sm">{scene.keyProps.join('、')}</div>
                    </div>
                  )}
                  {scene.spatialLayout && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Spatial layout</div>
                      <div className="text-sm">{scene.spatialLayout}</div>
                    </div>
                  )}
                </>
              )}
              
              {/* 视觉提示词（AI校准后显示） */}
              {((promptLanguage !== 'en' && scene.visualPrompt) || (promptLanguage !== 'zh' && scene.visualPromptEn)) && (
                <>
                  <Separator className="my-2" />
                  <div className="text-xs font-medium text-primary mb-2">Visual prompt</div>
                  
                  {promptLanguage !== 'en' && scene.visualPrompt && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Chinese</div>
                      <div className="text-sm text-muted-foreground">{scene.visualPrompt}</div>
                    </div>
                  )}
                  {promptLanguage !== 'zh' && scene.visualPromptEn && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">English</div>
                      <div className="text-sm text-muted-foreground italic">{scene.visualPromptEn}</div>
                    </div>
                  )}
                </>
              )}
              
              {/* 多视角联合图预览 - 仅显示 AI 分析的视角 */}
              {sceneShots.length > 0 && (() => {
                // 只使用 AI 分析的视角
                if (!scene.viewpoints || scene.viewpoints.length === 0) {
                  return (
                    <>
                      <Separator className="my-2" />
                      <div className="text-xs font-medium text-primary mb-2">
                        <Grid3X3 className="h-3 w-3 inline mr-1" />
                        Multi-view contact sheet
                      </div>
                      <div className="text-xs text-muted-foreground">
                        No analyzed viewpoints yet (optional; generated automatically after AI shot calibration)
                      </div>
                    </>
                  );
                }
                
                const viewpoints = scene.viewpoints.map(v => ({
                  ...v,
                  shotIndexes: v.shotIds?.map(id => {
                    const shot = sceneShots.find(s => s.id === id);
                    return shot?.index || 0;
                  }).filter(i => i > 0) || [],
                }));
                
                return (
                  <>
                    <Separator className="my-2" />
                    <div className="text-xs font-medium text-primary mb-2">
                      <Grid3X3 className="h-3 w-3 inline mr-1" />
                      Multi-view contact sheet
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-2">
                      AI analyzed {viewpoints.length} viewpoints
                    </div>
                    
                    {/* 视角列表 */}
                    <div className="space-y-1.5">
                      {viewpoints.slice(0, 6).map((vp, idx) => (
                        <div 
                          key={vp.id} 
                          className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50"
                        >
                          <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center font-medium">
                            {idx + 1}
                          </span>
                          <span className="flex-1 truncate">{promptLanguage === 'en' ? vp.nameEn || vp.name : vp.name || vp.nameEn}</span>
                          {vp.shotIndexes && vp.shotIndexes.length > 0 && (
                            <span className="text-muted-foreground">
                              Shots #{vp.shotIndexes.map(i => String(i).padStart(2, '0')).join(',#')}
                            </span>
                          )}
                        </div>
                      ))}
                      {viewpoints.length > 6 && (
                        <div className="text-xs text-muted-foreground text-center py-1">
                          {viewpoints.length - 6} more viewpoints...
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
              
              {/* 出场统计 */}
              {(scene.appearanceCount || scene.episodeNumbers?.length) && (
                <>
                  <Separator className="my-2" />
                  <div className="flex items-center gap-2 flex-wrap">
                    {scene.importance && (
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        scene.importance === 'main' ? 'bg-primary/10 text-primary' :
                        scene.importance === 'secondary' ? 'bg-yellow-500/10 text-yellow-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {scene.importance === 'main' ? 'Main scene' : scene.importance === 'secondary' ? 'Secondary scene' : 'Transition scene'}
                      </span>
                    )}
                    {scene.appearanceCount && (
                      <span className="text-xs text-muted-foreground">Appears {scene.appearanceCount} times</span>
                    )}
                    {scene.episodeNumbers && scene.episodeNumbers.length > 0 && (
                      <span className="text-xs text-muted-foreground">Episodes {scene.episodeNumbers.join(', ')}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <Separator />

          {/* 操作 */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => onGoToSceneLibrary?.(scene.id)}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to scene library to generate background
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopySceneData}
            >
              {copiedScene ? (
                <Check className="h-4 w-4 mr-2 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copiedScene ? 'Copied' : 'Copy scene data'}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => onGoToDirectorFromScene?.(scene.id)}
            >
              <Film className="h-4 w-4 mr-2" />
              Go to AI director to generate video
            </Button>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete scene
            </Button>
          </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm delete</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete scene "{scene.name || scene.location}"? All shots under it will also be deleted.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ScrollArea>
    );
  }

  // 分镜详情
  if (selectedItemType === "shot" && shot) {
    const shotStatus = getShotCompletionStatus(shot);
    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4 pb-32">
          {/* 头部 */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
              <Film className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Shot {String(shot.index).padStart(2, "0")}</h3>
              <StatusBadge status={shotStatus} />
            </div>
            {!isEditing ? (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={startEditing}>
                <Pencil className="h-3 w-3" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSave}>
                  <Save className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsEditing(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* 预览图 */}
          {shot.imageUrl && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={shot.imageUrl}
                alt={`Shot ${shot.index}`}
                className="w-full h-auto"
              />
            </div>
          )}

          <Separator />

          {/* 属性 */}
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Shot size</Label>
                  <Input value={editData.shotSize || ""} onChange={(e) => setEditData({ ...editData, shotSize: e.target.value })} className="h-8" placeholder="For example: WS/MS/CU/ECU" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Camera movement</Label>
                  <Select value={editData.cameraMovement || 'none'} onValueChange={(v) => setEditData({ ...editData, cameraMovement: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAMERA_MOVEMENT_PRESETS.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Special technique</Label>
                <Select value={editData.specialTechnique || 'none'} onValueChange={(v) => setEditData({ ...editData, specialTechnique: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPECIAL_TECHNIQUE_PRESETS.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Action summary</Label>
                <Textarea value={editData.actionSummary || ""} onChange={(e) => setEditData({ ...editData, actionSummary: e.target.value })} className="min-h-[80px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dialogue</Label>
                <Textarea value={editData.dialogue || ""} onChange={(e) => setEditData({ ...editData, dialogue: e.target.value })} className="min-h-[60px]" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 镜头信息：景别 + 运动 + 时长 */}
              <div className="flex items-center gap-2 flex-wrap">
                {shot.shotSize && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                    {shot.shotSize}
                  </span>
                )}
                {shot.cameraMovement && shot.cameraMovement !== 'none' && (
                  <span className="px-2 py-0.5 bg-muted rounded text-xs">
                    {CAMERA_MOVEMENT_PRESETS.find(p => p.id === shot.cameraMovement)?.label || shot.cameraMovement}
                  </span>
                )}
                {shot.specialTechnique && shot.specialTechnique !== 'none' && (
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 rounded text-xs">
                    {SPECIAL_TECHNIQUE_PRESETS.find(p => p.id === shot.specialTechnique)?.label || shot.specialTechnique}
                  </span>
                )}
                {(shot as any).duration && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs">
                    <Timer className="h-3 w-3" />
                    {(shot as any).duration}s
                  </span>
                )}
              </div>

              {/* 详细视觉描述 */}
              {(shot as any).visualDescription && (
                <div className="bg-gradient-to-r from-primary/5 to-transparent p-3 rounded-lg border-l-2 border-primary/30">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Visual
                  </div>
                  <div className="text-sm leading-relaxed">{(shot as any).visualDescription}</div>
                </div>
              )}

              {/* 动作描述 */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Action summary</div>
                <div className="text-sm">{shot.actionSummary}</div>
              </div>

              {/* 音频设计 */}
              {((shot as any).ambientSound || (shot as any).soundEffect || shot.dialogue) && (
                <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Volume2 className="h-3 w-3" />
                    Audio
                  </div>
                  {(shot as any).ambientSound && (
                    <div>
                      <span className="text-xs text-muted-foreground">Ambient sound: </span>
                      <span className="text-xs italic">{(shot as any).ambientSound}</span>
                    </div>
                  )}
                  {(shot as any).soundEffect && (
                    <div>
                      <span className="text-xs text-muted-foreground">Sound effect: </span>
                      <span className="text-xs italic">{(shot as any).soundEffect}</span>
                    </div>
                  )}
                  {shot.dialogue && (
                    <div>
                      <span className="text-xs text-muted-foreground">Dialogue: </span>
                      <span className="text-xs italic">"{shot.dialogue}"</span>
                    </div>
                  )}
                </div>
              )}

              {/* 出场角色 */}
              {shot.characterNames && shot.characterNames.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Characters</div>
                  <div className="flex flex-wrap gap-1">
                    {shot.characterNames.map((name, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-muted rounded text-xs"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 情绪标签 */}
              {shot.emotionTags && shot.emotionTags.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Emotion</div>
                  <div className="flex flex-wrap gap-1">
                    {shot.emotionTags.map((tag, i) => {
                      const emotionLabels: Record<string, string> = {
                        happy: 'Happy', sad: 'Sad', angry: 'Angry', surprised: 'Surprised', fearful: 'Fearful', calm: 'Calm',
                        tense: 'Tense', excited: 'Excited', mysterious: 'Mysterious', romantic: 'Romantic', funny: 'Funny', touching: 'Touching',
                        serious: 'Serious', relaxed: 'Relaxed', playful: 'Playful', gentle: 'Gentle', passionate: 'Passionate', low: 'Low'
                      };
                      return (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs"
                        >
                          {emotionLabels[tag] || tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 生成状态 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Image</span>
              <StatusBadge
                status={
                  shot.imageStatus === "completed"
                    ? "completed"
                    : shot.imageStatus === "generating"
                    ? "in_progress"
                    : "pending"
                }
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Video</span>
              <StatusBadge
                status={
                  shot.videoStatus === "completed"
                    ? "completed"
                    : shot.videoStatus === "generating"
                    ? "in_progress"
                    : "pending"
                }
              />
            </div>
          </div>

          <Separator />

          {/* 操作 */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => onGoToDirector?.(shot.id)}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to AI director
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleCopyShotTriPrompts}
            >
              {copiedShotPrompts ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy tri-layer prompt data
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete shot
            </Button>
          </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm delete</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete shot {shot.index}?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ScrollArea>
    );
  }

  return null;
}
