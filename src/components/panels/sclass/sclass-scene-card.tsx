// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * Split scene card component
 * Shows a single scene's images, video preview, and prompt editing controls.
 * Used for SplitScene (different from the AIScene type in scene-card.tsx).
 */

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  type SplitScene, 
  type EmotionTag,
  type ShotSizeType,
  type DurationType,
  type SoundEffectTag,
  CAMERA_MOVEMENT_PRESETS,
  SPECIAL_TECHNIQUE_PRESETS,
  CAMERA_ANGLE_PRESETS,
  PHOTOGRAPHY_TECHNIQUE_PRESETS,
  FOCAL_LENGTH_PRESETS,
} from "@/stores/director-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Play,
  ImageIcon,
  AlertCircle,
  Loader2,
  Sparkles,
  Download,
  RefreshCw,
  Upload,
  MapPin,
  RotateCw,
  Camera,
  Grid2X2,
  Square,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { EmotionTags } from "../director/emotion-tags";
import { ShotSizeSelector } from "../director/shot-size-selector";
import { DurationSelector } from "../director/duration-selector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePreviewStore } from "@/stores/preview-store";
import { CharacterSelector } from "../director/character-selector";
import { SceneLibrarySelector } from "../director/scene-library-selector";
import { MediaLibrarySelector } from "../director/media-library-selector";
import { EditableTextField } from "../director/editable-text-field";
import { useResolvedImageUrl } from "@/hooks/use-resolved-image-url";

export interface SplitSceneCardProps {
  scene: SplitScene;
  // Three-layer prompt update callbacks
  onUpdateImagePrompt: (id: number, prompt: string, promptZh?: string) => void;
  onUpdateVideoPrompt: (id: number, prompt: string, promptZh?: string) => void;
  onUpdateEndFramePrompt: (id: number, prompt: string, promptZh?: string) => void;
  onUpdateNeedsEndFrame: (id: number, needsEndFrame: boolean) => void;
  onUpdateEndFrame: (id: number, imageUrl: string | null) => void;
  onUpdateCharacters: (id: number, characterIds: string[]) => void;
  onUpdateCharacterVariationMap?: (id: number, map: Record<string, string>) => void;
  onUpdateEmotions: (id: number, emotionTags: EmotionTag[]) => void;
  onUpdateShotSize: (id: number, shotSize: ShotSizeType | null) => void;
  onUpdateDuration: (id: number, duration: DurationType) => void;
  onUpdateAmbientSound: (id: number, ambientSound: string) => void;
  onUpdateSoundEffects: (id: number, soundEffects: SoundEffectTag[]) => void;
  // Scene library reference callbacks
  onUpdateSceneReference?: (id: number, sceneLibraryId?: string, viewpointId?: string, referenceImage?: string, subViewId?: string) => void;
  onUpdateEndFrameSceneReference?: (id: number, sceneLibraryId?: string, viewpointId?: string, referenceImage?: string, subViewId?: string) => void;
  onDelete: (id: number) => void;
  onSaveToLibrary?: (scene: SplitScene, type: 'image' | 'video') => void;
  onGenerateImage?: (sceneId: number) => void;
  onGenerateVideo?: (sceneId: number) => void;
  onGenerateEndFrame?: (sceneId: number) => void;
  onRemoveImage?: (sceneId: number) => void;
  onUploadImage?: (sceneId: number, imageDataUrl: string) => void;
  // Generic field update callback (for double-click editing)
  onUpdateField?: (sceneId: number, field: keyof SplitScene, value: any) => void;
  // Angle switch callback
  onAngleSwitch?: (sceneId: number, type: "start" | "end") => void;
  // Quad-grid callback
  onQuadGrid?: (sceneId: number, type: "start" | "end") => void;
  // Extract video last-frame callback
  onExtractVideoLastFrame?: (sceneId: number) => void;
  // Stop generation callback
  onStopImageGeneration?: (sceneId: number) => void;
  onStopVideoGeneration?: (sceneId: number) => void;
  onStopEndFrameGeneration?: (sceneId: number) => void;
  isExtractingFrame?: boolean;
  isAngleSwitching?: boolean;
  isQuadGridGenerating?: boolean;
  isGeneratingAny?: boolean;
}

export function SClassSceneCard({
  scene, 
  onUpdateImagePrompt,
  onUpdateVideoPrompt,
  onUpdateEndFramePrompt,
  onUpdateNeedsEndFrame,
  onUpdateEndFrame,
  onUpdateCharacters,
  onUpdateCharacterVariationMap,
  onUpdateEmotions,
  onUpdateShotSize,
  onUpdateDuration,
  onUpdateAmbientSound,
  onUpdateSoundEffects,
  onUpdateSceneReference,
  onUpdateEndFrameSceneReference,
  onDelete,
  onSaveToLibrary,
  onGenerateImage,
  onGenerateVideo,
  onGenerateEndFrame,
  onRemoveImage,
  onUploadImage,
  onUpdateField,
  onAngleSwitch,
  onQuadGrid,
  onExtractVideoLastFrame,
  onStopImageGeneration,
  onStopVideoGeneration,
  onStopEndFrameGeneration,
  isExtractingFrame,
  isAngleSwitching,
  isQuadGridGenerating,
  isGeneratingAny,
}: SplitSceneCardProps) {
  // Editing state: 'none' | 'image' | 'video' | 'endFrame'
  const [editingPrompt, setEditingPrompt] = useState<'none' | 'image' | 'video' | 'endFrame'>('none');
  const [editPromptValue, setEditPromptValue] = useState('');
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  // Currently selected frame target: 'start' | 'end' for media library selection
  const [selectedFrameTarget, setSelectedFrameTarget] = useState<'start' | 'end'>('start');
  const endFrameInputRef = useRef<HTMLInputElement>(null);
  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const { setPreviewItem } = usePreviewStore();

  // Compute effective display URLs: imageDataUrl → imageHttpUrl fallback
  // (partialize strips data: base64 on save; imageHttpUrl may survive as external URL)
  const effectiveImageUrl = scene.imageDataUrl || scene.imageHttpUrl || '';
  const effectiveEndFrameUrl = scene.endFrameImageUrl || scene.endFrameHttpUrl || '';

  // Resolve local-image:// paths to displayable URLs
  const resolvedImageUrl = useResolvedImageUrl(effectiveImageUrl);
  const resolvedEndFrameUrl = useResolvedImageUrl(effectiveEndFrameUrl);

  // Start editing a prompt
  const startEditing = (type: 'image' | 'video' | 'endFrame') => {
    if (type === 'image') {
      setEditPromptValue(scene.imagePromptZh || scene.imagePrompt || '');
    } else if (type === 'video') {
      setEditPromptValue(scene.videoPromptZh || scene.videoPrompt || '');
    } else {
      setEditPromptValue(scene.endFramePromptZh || scene.endFramePrompt || '');
    }
    setEditingPrompt(type);
  };

  // Save prompt
  const handleSavePrompt = () => {
    if (editingPrompt === 'image') {
      onUpdateImagePrompt(scene.id, scene.imagePrompt, editPromptValue);
      toast.success(`Scene ${scene.id + 1} first-frame prompt updated`);
    } else if (editingPrompt === 'video') {
      onUpdateVideoPrompt(scene.id, scene.videoPrompt, editPromptValue);
      toast.success(`Scene ${scene.id + 1} video prompt updated`);
    } else if (editingPrompt === 'endFrame') {
      onUpdateEndFramePrompt(scene.id, scene.endFramePrompt, editPromptValue);
      toast.success(`Scene ${scene.id + 1} last-frame prompt updated`);
    }
    setEditingPrompt('none');
  };

  const handleCancelEdit = () => {
    setEditingPrompt('none');
    setEditPromptValue('');
  };

  // Handle first-frame image upload
  const handleFirstFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onUploadImage?.(scene.id, dataUrl);
      toast.success(`Scene ${scene.id + 1} first frame uploaded`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle last-frame image upload
  const handleEndFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onUpdateEndFrame(scene.id, dataUrl);
      toast.success(`Scene ${scene.id + 1} last frame uploaded`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Remove last frame
  const handleRemoveEndFrame = () => {
    onUpdateEndFrame(scene.id, null);
    toast.success(`Scene ${scene.id + 1} last frame removed`);
  };

  // Remove first frame
  const handleRemoveImage = () => {
    onRemoveImage?.(scene.id);
    toast.success(`Scene ${scene.id + 1} first frame removed`);
  };

  // Download image
  const handleDownloadImage = async (imageUrl: string, filename: string) => {
    try {
      let blob: Blob;
      if (imageUrl.startsWith('data:')) {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      } else if (imageUrl.startsWith('http')) {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      } else {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`${filename} downloaded`);
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Download failed');
    }
  };

  // Status helpers
  const isImageGenerating = scene.imageStatus === 'generating' || scene.imageStatus === 'uploading';
  const isVideoReady = scene.videoStatus === 'completed' && scene.videoUrl;
  const isVideoGenerating = scene.videoStatus === 'generating' || scene.videoStatus === 'uploading';
  const isVideoFailed = scene.videoStatus === 'failed';
  const isVideoModerationSkipped = isVideoFailed && scene.videoError?.startsWith('MODERATION_SKIPPED:');
  const hasImage = !!effectiveImageUrl;
  const hasEndFrame = !!effectiveEndFrameUrl;
  const canDragVideo = isVideoReady && scene.videoUrl;

  // Handle drag start for video
  const handleVideoDragStart = (e: React.DragEvent) => {
    if (!canDragVideo || !scene.videoUrl) return;
    
    const dragData = {
      id: scene.videoMediaId || `scene-${scene.id}-video`,
      type: 'video',
      name: `Scene ${scene.id + 1} - AI Video`,
      url: scene.videoUrl,
      thumbnailUrl: scene.imageDataUrl,
      duration: 5,
    };
    
    e.dataTransfer.setData('application/x-media-item', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
    
    const dragImage = document.createElement('div');
    dragImage.className = 'bg-primary text-white px-2 py-1 rounded text-xs';
    dragImage.textContent = `Scene ${scene.id + 1} video`;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  // Hidden file upload inputs
  const firstFrameInput = (
    <input
      ref={firstFrameInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFirstFrameUpload}
    />
  );

  const endFrameInput = (
    <input
      ref={endFrameInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleEndFrameUpload}
    />
  );

  return (
    <div className="group relative border rounded-lg overflow-hidden bg-card hover:border-primary/50 transition-colors">
      {/* Scene number and control bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-muted-foreground">Scene #{scene.id + 1}</span>
          {(scene.sceneName || scene.sceneLocation) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary cursor-default">
                    <MapPin className="h-3 w-3" />
                    {scene.sceneName || scene.sceneLocation}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    {scene.sceneName && <p>Scene: {scene.sceneName}</p>}
                    {scene.sceneLocation && <p>Location: {scene.sceneLocation}</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <ShotSizeSelector
            value={scene.shotSize}
            onChange={(v) => onUpdateShotSize(scene.id, v)}
            disabled={isGeneratingAny}
            className="w-24"
          />
        </div>
        {!isGeneratingAny && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete scene #{scene.id + 1}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all content for the scene and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(scene.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* First row: first-frame image + last-frame image + character picker */}
      <div className="p-2 space-y-2">
        <div className="flex gap-2">
          {/* First-frame image */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => setSelectedFrameTarget('start')}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded transition-colors",
                  selectedFrameTarget === 'start'
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                First frame
              </button>
              {hasImage && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAngleSwitch?.(scene.id, "start"); }}
                    disabled={isAngleSwitching}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 disabled:opacity-50 flex items-center gap-0.5"
                  >
                    <RotateCw className="h-2.5 w-2.5" />
                    Angle
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onQuadGrid?.(scene.id, "start"); }}
                    disabled={isQuadGridGenerating}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-600 hover:bg-cyan-500/30 disabled:opacity-50 flex items-center gap-0.5"
                  >
                    <Grid2X2 className="h-2.5 w-2.5" />
                    Quad grid
                  </button>
                </div>
              )}
            </div>
            <div 
              className={cn(
                "aspect-video bg-muted rounded cursor-pointer relative group/image overflow-hidden border-2 transition-colors",
                selectedFrameTarget === 'start'
                  ? "border-primary border-solid"
                  : "border-dashed border-muted-foreground/20 hover:border-primary/50"
              )}
              onClick={() => {
                setSelectedFrameTarget('start');
                if (hasImage && resolvedImageUrl) {
                  setPreviewItem({ type: 'image', url: resolvedImageUrl, name: `Scene ${scene.id + 1} first frame` });
                } else {
                  firstFrameInputRef.current?.click();
                }
              }}
            >
              {hasImage ? (
                <>
                  <img
                    src={resolvedImageUrl || ''}
                    alt={`Scene ${scene.id + 1} first frame`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAngleSwitch?.(scene.id, "start"); }}
                      disabled={isAngleSwitching}
                      className="p-0.5 rounded bg-black/50 text-white hover:bg-amber-600 disabled:opacity-50"
                      title="Switch angle"
                    >
                      <RotateCw className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onQuadGrid?.(scene.id, "start"); }}
                      disabled={isQuadGridGenerating}
                      className="p-0.5 rounded bg-black/50 text-white hover:bg-cyan-600 disabled:opacity-50"
                      title="Generate quad grid"
                    >
                      <Grid2X2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDownloadImage(resolvedImageUrl || scene.imageDataUrl, `scene${scene.id + 1}_first_frame.png`); }}
                      className="p-0.5 rounded bg-black/50 text-white hover:bg-blue-600"
                      title="Download first frame"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleRemoveImage(); }}
                      className="p-0.5 rounded bg-black/50 text-white hover:bg-red-600"
                      title="Delete first frame"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {scene.imageSource === 'ai-generated' && (
                    <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-primary text-white px-1 rounded">AI</span>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <Upload className="h-4 w-4 text-muted-foreground/50" />
                  <span className="text-[10px] text-muted-foreground/50">Upload</span>
                </div>
              )}
              {isImageGenerating && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                  <span className="text-[10px] text-white">Generating {scene.imageProgress}%</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStopImageGeneration?.(scene.id); }}
                    className="mt-1 px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-600 text-white text-[9px] flex items-center gap-0.5 transition-colors"
                    title="Stop generation"
                  >
                    <Square className="h-2.5 w-2.5" />Stop
                  </button>
                </div>
              )}
            </div>
            {firstFrameInput}
          </div>

          {/* Last-frame image */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedFrameTarget('end')}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded transition-colors",
                    selectedFrameTarget === 'end'
                      ? "bg-orange-500/20 text-orange-500 font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Last frame
                </button>
                <button
                  onClick={() => onUpdateNeedsEndFrame(scene.id, !scene.needsEndFrame)}
                  disabled={isGeneratingAny}
                  className={cn(
                    "text-[9px] px-1 py-0.5 rounded transition-colors",
                    scene.needsEndFrame
                      ? "bg-orange-500/20 text-orange-500 hover:bg-orange-500/30"
                      : "bg-muted text-muted-foreground/60 hover:bg-muted/80"
                  )}
                >
                  {scene.needsEndFrame ? 'Required' : 'Optional'}
                </button>
              </div>
              <div className="flex items-center gap-1">
                {hasEndFrame && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAngleSwitch?.(scene.id, "end"); }}
                      disabled={isAngleSwitching}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 disabled:opacity-50 flex items-center gap-0.5"
                    >
                      <RotateCw className="h-2.5 w-2.5" />
                      Angle
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onQuadGrid?.(scene.id, "end"); }}
                      disabled={isQuadGridGenerating}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-600 hover:bg-cyan-500/30 disabled:opacity-50 flex items-center gap-0.5"
                    >
                      <Grid2X2 className="h-2.5 w-2.5" />
                      Quad grid
                    </button>
                  </>
                )}
              {/* Last-frame AI generate button: can generate whether required or optional */}
                {!hasEndFrame && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onGenerateEndFrame?.(scene.id); }}
                    disabled={isGeneratingAny || scene.endFrameStatus === 'generating'}
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded disabled:opacity-50",
                      scene.needsEndFrame 
                        ? "bg-orange-500/20 text-orange-500 hover:bg-orange-500/30"
                        : "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                    )}
                  >
                    {scene.endFrameStatus === 'generating' ? (
                      <span className="flex items-center gap-0.5"><Loader2 className="h-2.5 w-2.5 animate-spin" />{scene.endFrameProgress}%</span>
                    ) : (
                      <span className="flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" />AI generate</span>
                    )}
                  </button>
                )}
              </div>
            </div>
            <div 
              className={cn(
                "aspect-video bg-muted rounded cursor-pointer relative group/endframe overflow-hidden border-2 transition-colors",
                selectedFrameTarget === 'end'
                  ? "border-orange-500 border-solid"
                  : scene.needsEndFrame 
                    ? "border-dashed border-orange-500/30 hover:border-orange-500/50" 
                    : "border-dashed border-blue-400/30 hover:border-blue-400/50"
              )}
              onClick={() => {
                setSelectedFrameTarget('end');
                if (hasEndFrame && resolvedEndFrameUrl) {
                  setPreviewItem({ type: 'image', url: resolvedEndFrameUrl, name: `Scene ${scene.id + 1} last frame` });
                } else {
                  endFrameInputRef.current?.click();
                }
              }}
            >
              {hasEndFrame ? (
                <>
                  <img
                    src={resolvedEndFrameUrl || ''}
                    alt={`Scene ${scene.id + 1} last frame`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/endframe:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAngleSwitch?.(scene.id, "end"); }}
                      disabled={isAngleSwitching}
                      className="p-0.5 rounded bg-black/50 text-white hover:bg-amber-600 disabled:opacity-50"
                      title="Switch angle"
                    >
                      <RotateCw className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onQuadGrid?.(scene.id, "end"); }}
                      disabled={isQuadGridGenerating}
                      className="p-0.5 rounded bg-black/50 text-white hover:bg-cyan-600 disabled:opacity-50"
                      title="Generate quad grid"
                    >
                      <Grid2X2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDownloadImage(resolvedEndFrameUrl || scene.endFrameImageUrl!, `scene${scene.id + 1}_last_frame.png`); }}
                      className="p-0.5 rounded bg-black/50 text-white hover:bg-blue-600"
                      title="Download last frame"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleRemoveEndFrame(); }}
                      className="p-0.5 rounded bg-black/50 text-white hover:bg-red-600"
                      title="Delete last frame"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {scene.endFrameSource === 'ai-generated' && (
                    <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-orange-500 text-white px-1 rounded">AI</span>
                  )}
                </>
              ) : scene.endFrameStatus === 'generating' ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-orange-500/10">
                  <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
                  <span className="text-[10px] text-orange-500">Generating {scene.endFrameProgress}%</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStopEndFrameGeneration?.(scene.id); }}
                    className="mt-0.5 px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-600 text-white text-[9px] flex items-center gap-0.5 transition-colors"
                    title="Stop generation"
                  >
                    <Square className="h-2.5 w-2.5" />Stop
                  </button>
                </div>
              ) : scene.needsEndFrame ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-orange-500/5">
                  <span className="text-orange-500 text-lg">◉</span>
                  <span className="text-[10px] text-orange-500/70">Last frame required</span>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-blue-500/5">
                  <Upload className="h-4 w-4 text-blue-400/60" />
                  <span className="text-[10px] text-blue-400/60">Upload / generate</span>
                </div>
              )}
            </div>
            {endFrameInput}
          </div>

          {/* Character library + scene reference selection */}
          <div className="flex flex-col gap-1 justify-end">
            <CharacterSelector
              selectedIds={scene.characterIds || []}
              onChange={(ids) => onUpdateCharacters(scene.id, ids)}
              characterVariationMap={scene.characterVariationMap}
              onChangeVariation={(charId, varId) => {
                const current = { ...(scene.characterVariationMap || {}) };
                if (varId) {
                  current[charId] = varId;
                } else {
                  delete current[charId];
                }
                onUpdateCharacterVariationMap?.(scene.id, current);
              }}
              disabled={isGeneratingAny}
            />
            {onUpdateSceneReference && (
              <SceneLibrarySelector
                sceneId={scene.id}
                selectedSceneLibraryId={scene.sceneLibraryId}
                selectedViewpointId={scene.viewpointId}
                selectedSubViewId={scene.subViewId}
                isEndFrame={false}
                onChange={(sceneLibId, viewpointId, refImage, subViewId) => 
                  onUpdateSceneReference(scene.id, sceneLibId, viewpointId, refImage, subViewId)
                }
                disabled={isGeneratingAny}
              />
            )}
            {/* Scene reference selector - switches by selected frame target */}
            {selectedFrameTarget === 'start' ? (
              // First-frame scene reference is rendered above
              null
            ) : (
              // Last-frame scene selector
              onUpdateEndFrameSceneReference && (
                <SceneLibrarySelector
                  sceneId={scene.id}
                  selectedSceneLibraryId={scene.endFrameSceneLibraryId}
                  selectedViewpointId={scene.endFrameViewpointId}
                  selectedSubViewId={scene.endFrameSubViewId}
                  isEndFrame={true}
                  onChange={(sceneLibId, viewpointId, refImage, subViewId) => 
                    onUpdateEndFrameSceneReference(scene.id, sceneLibId, viewpointId, refImage, subViewId)
                  }
                  disabled={isGeneratingAny}
                />
              )
            )}
            {/* Media library selector - applies to the selected frame target */}
            {onUploadImage && (
              <MediaLibrarySelector
                sceneId={scene.id}
                isEndFrame={selectedFrameTarget === 'end'}
                onSelect={(imageUrl) => {
                  if (selectedFrameTarget === 'start') {
                    onUploadImage(scene.id, imageUrl);
                  } else {
                    onUpdateEndFrame(scene.id, imageUrl);
                  }
                }}
                disabled={isGeneratingAny}
              />
            )}
          </div>
        </div>

        {/* Second row: image/video generation buttons + video preview/status */}
        <div className="flex items-center gap-2">
          {!hasImage ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs"
                onClick={() => onGenerateImage?.(scene.id)}
                disabled={isGeneratingAny || isImageGenerating}
              >
                {isImageGenerating ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating {scene.imageProgress}%</>
                ) : (
                  <><ImageIcon className="h-3 w-3 mr-1" />Generate image</>
                )}
              </Button>
              {isImageGenerating && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs px-2"
                  onClick={() => onStopImageGeneration?.(scene.id)}
                  title="Stop generation"
                >
                  <Square className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={isVideoReady ? "outline" : "default"}
                className="h-7 text-xs"
                onClick={() => onGenerateVideo?.(scene.id)}
                disabled={isGeneratingAny || isVideoGenerating}
              >
                {isVideoGenerating ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating {scene.videoProgress}%</>
                ) : isVideoReady ? (
                  <><RefreshCw className="h-3 w-3 mr-1" />Regenerate</>
                ) : (
                  <><Play className="h-3 w-3 mr-1" />Generate video</>
                )}
              </Button>
              {isVideoGenerating && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs px-2"
                  onClick={() => onStopVideoGeneration?.(scene.id)}
                  title="Stop generation"
                >
                  <Square className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          
          {isVideoReady && scene.videoUrl && (
            <div className="flex items-center gap-1">
              <div 
                className="flex-1 aspect-video max-w-[120px] bg-muted rounded overflow-hidden cursor-pointer relative"
                onClick={() => setPreviewItem({ type: 'video', url: scene.videoUrl!, name: `Scene ${scene.id + 1} video` })}
                draggable={!!canDragVideo}
                onDragStart={handleVideoDragStart}
              >
                <video src={scene.videoUrl} className="w-full h-full object-cover" muted preload="none" poster={resolvedImageUrl || undefined} />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-4 w-4 text-white" />
                </div>
                {canDragVideo && (
                  <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-green-600 text-white px-1 rounded">Drag to timeline</span>
                )}
              </div>
              {/* Extract last-frame button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExtractVideoLastFrame?.(scene.id);
                      }}
                      disabled={isExtractingFrame || isGeneratingAny}
                      className="p-1.5 rounded bg-cyan-500/20 text-cyan-600 hover:bg-cyan-500/30 disabled:opacity-50 transition-colors"
                    >
                      {isExtractingFrame ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Extract the last frame to the next scene's first frame</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {isVideoFailed && (
            <span className={cn(
              "text-xs flex items-center gap-1",
              isVideoModerationSkipped 
                ? "text-amber-500" 
                : "text-destructive"
            )}>
              <AlertCircle className="h-3 w-3" />
              {isVideoModerationSkipped 
                ? 'Moderation skipped'
                : (scene.videoError || 'Generation failed')}
            </span>
          )}
        </div>

        {/* Third row: prompt system (script action + three-layer prompts + emotion tags) */}
        <div className="space-y-1.5">
          {/* Collapsible header: chevron + title + status badges */}
          <button
            onClick={() => setShowPromptDetails(!showPromptDetails)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md bg-muted/50 border hover:bg-muted/70 transition-colors"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200", showPromptDetails && "rotate-90")} />
            <span className="text-xs font-medium">Prompts</span>
            {/* Status badges */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 border",
                scene.actionSummary
                  ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20"
                  : "bg-muted text-muted-foreground/40 border-transparent"
              )}>
                <Edit3 className="h-2.5 w-2.5" /> Script
              </span>
              <span className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 border",
                (scene.imagePromptZh || scene.imagePrompt)
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  : "bg-muted text-muted-foreground/40 border-transparent"
              )}>
                <ImageIcon className="h-2.5 w-2.5" /> First frame
              </span>
              <span className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 border",
                (scene.endFramePromptZh || scene.endFramePrompt)
                  ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20"
                  : scene.needsEndFrame
                    ? "bg-orange-500/5 text-orange-400/60 border-dashed border-orange-400/30"
                    : "bg-muted text-muted-foreground/40 border-transparent"
              )}>
                ◉ Last frame
              </span>
              <span className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 border",
                (scene.videoPromptZh || scene.videoPrompt)
                  ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20"
                  : "bg-muted text-muted-foreground/40 border-transparent"
              )}>
                <Play className="h-2.5 w-2.5" /> Video
              </span>
            </div>
          </button>

          {showPromptDetails ? (
            <div className="space-y-2 pl-1">
              {/* Script action (prompt source) - purple border */}
              <div className="border-l-[3px] border-violet-500 pl-3 py-1 space-y-1">
                <Label className="text-[10px] text-violet-600 dark:text-violet-400 flex items-center gap-1 font-medium">
                  <Edit3 className="h-3 w-3" />
                  Script action (prompt source)
                </Label>
                <div className="rounded bg-violet-500/5 border border-violet-500/10">
                  <EditableTextField
                    label=""
                    value={scene.actionSummary || ''}
                    onChange={(v) => onUpdateField?.(scene.id, 'actionSummary', v)}
                    placeholder="Double-click to add an action description (AI will generate the three-layer prompts from this)..."
                    disabled={isGeneratingAny}
                    multiline
                  />
                </div>
              </div>

              {/* First-frame prompt - blue border */}
              <div className="border-l-[3px] border-blue-500 pl-3 py-1 space-y-1">
                <Label className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-medium">
                  <ImageIcon className="h-3 w-3" />
                  First-frame prompt (static image)
                </Label>
                {editingPrompt === 'image' ? (
                  <>
                    <Textarea
                      value={editPromptValue}
                      onChange={(e) => setEditPromptValue(e.target.value)}
                      className="min-h-[50px] text-xs resize-none border-blue-500/30 focus-visible:ring-blue-500/30"
                      placeholder="Describe the first-frame still image..."
                      autoFocus
                    />
                    <div className="flex gap-1 justify-end mt-1">
                      <Button variant="outline" size="sm" onClick={handleCancelEdit} className="h-5 px-2 text-[10px]">
                        <X className="h-2.5 w-2.5 mr-0.5" />Cancel
                      </Button>
                      <Button size="sm" onClick={handleSavePrompt} className="h-5 px-2 text-[10px]">
                        <Check className="h-2.5 w-2.5 mr-0.5" />Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <div 
                    className="flex items-start gap-2 cursor-pointer p-1.5 rounded bg-blue-500/5 hover:bg-blue-500/10 transition-colors border border-blue-500/10"
                    onClick={() => !isGeneratingAny && startEditing('image')}
                  >
                    <p className="text-[11px] text-muted-foreground flex-1 line-clamp-2 min-h-[1.5em]">
                      {scene.imagePromptZh || scene.imagePrompt || "Click to add a first-frame description..."}
                    </p>
                    {!isGeneratingAny && <Edit3 className="h-2.5 w-2.5 text-blue-500/50 shrink-0 mt-0.5" />}
                  </div>
                )}
              </div>

              {/* Last-frame prompt - orange border */}
              <div className="border-l-[3px] border-orange-500 pl-3 py-1 space-y-1">
                <Label className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-1 font-medium">
                  <span>◉</span>
                  Last-frame prompt{scene.needsEndFrame ? '' : ' (optional)'}
                </Label>
                {editingPrompt === 'endFrame' ? (
                  <>
                    <Textarea
                      value={editPromptValue}
                      onChange={(e) => setEditPromptValue(e.target.value)}
                      className="min-h-[50px] text-xs resize-none border-orange-500/30 focus-visible:ring-orange-500/30"
                      placeholder="Describe the last-frame still image..."
                      autoFocus
                    />
                    <div className="flex gap-1 justify-end mt-1">
                      <Button variant="outline" size="sm" onClick={handleCancelEdit} className="h-5 px-2 text-[10px]">
                        <X className="h-2.5 w-2.5 mr-0.5" />Cancel
                      </Button>
                      <Button size="sm" onClick={handleSavePrompt} className="h-5 px-2 text-[10px]">
                        <Check className="h-2.5 w-2.5 mr-0.5" />Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <div 
                    className={cn(
                      "flex items-start gap-2 cursor-pointer p-1.5 rounded transition-colors border",
                      scene.needsEndFrame 
                        ? "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20" 
                        : "bg-orange-500/5 hover:bg-orange-500/10 border-orange-500/10"
                    )}
                    onClick={() => !isGeneratingAny && startEditing('endFrame')}
                  >
                    <p className={cn(
                      "text-[11px] flex-1 line-clamp-2 min-h-[1.5em]",
                      "text-orange-600 dark:text-orange-400"
                    )}>
                      {scene.endFramePromptZh || scene.endFramePrompt || (scene.needsEndFrame ? "Click to add a last-frame description..." : "Click to add a last-frame description... (optional)")}
                    </p>
                    {!isGeneratingAny && <Edit3 className="h-2.5 w-2.5 text-orange-500/50 shrink-0 mt-0.5" />}
                  </div>
                )}
              </div>

              {/* Video prompt - green border */}
              <div className="border-l-[3px] border-green-500 pl-3 py-1 space-y-1.5">
                <Label className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                  <Play className="h-3 w-3" />
                  Video prompt (motion)
                </Label>
                {/* Video prompt text */}
                {editingPrompt === 'video' ? (
                  <>
                    <Textarea
                      value={editPromptValue}
                      onChange={(e) => setEditPromptValue(e.target.value)}
                      className="min-h-[50px] text-xs resize-none border-green-500/30 focus-visible:ring-green-500/30"
                      placeholder="Describe the motion, movement, and changes in the video..."
                      autoFocus
                    />
                    <div className="flex gap-1 justify-end mt-1">
                      <Button variant="outline" size="sm" onClick={handleCancelEdit} className="h-5 px-2 text-[10px]">
                        <X className="h-2.5 w-2.5 mr-0.5" />Cancel
                      </Button>
                      <Button size="sm" onClick={handleSavePrompt} className="h-5 px-2 text-[10px]">
                        <Check className="h-2.5 w-2.5 mr-0.5" />Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <div 
                    className="flex items-start gap-2 cursor-pointer p-1.5 rounded bg-green-500/5 hover:bg-green-500/10 transition-colors border border-green-500/10"
                    onClick={() => !isGeneratingAny && startEditing('video')}
                  >
                    <p className="text-[11px] text-green-600 dark:text-green-400 flex-1 line-clamp-2 min-h-[1.5em]">
                      {scene.videoPromptZh || scene.videoPrompt || "Click to add a motion description..."}
                    </p>
                    {!isGeneratingAny && <Edit3 className="h-2.5 w-2.5 text-green-500/50 shrink-0 mt-0.5" />}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Collapsed summary view: colored icon tags + content preview */
            <div 
              className="space-y-1 p-2 rounded-md bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors border border-transparent hover:border-muted"
              onClick={() => setShowPromptDetails(true)}
            >
              <p className="text-[10px] truncate flex items-center gap-1.5">
                <span className="shrink-0 inline-flex items-center gap-0.5 text-violet-600 dark:text-violet-400 font-medium">
                  <Edit3 className="h-2.5 w-2.5" /> Script:
                </span>
                <span className="text-muted-foreground">{scene.actionSummary || 'Not set'}</span>
              </p>
              <p className="text-[10px] truncate flex items-center gap-1.5">
                <span className="shrink-0 inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium">
                  <ImageIcon className="h-2.5 w-2.5" /> First frame:
                </span>
                <span className="text-muted-foreground">{scene.imagePromptZh || scene.imagePrompt || 'Not set'}</span>
              </p>
              {(scene.needsEndFrame || scene.endFramePromptZh || scene.endFramePrompt) && (
                <p className="text-[10px] truncate flex items-center gap-1.5">
                  <span className="shrink-0 inline-flex items-center gap-0.5 text-orange-600 dark:text-orange-400 font-medium">
                    ◉ Last frame:
                  </span>
                  <span className="text-orange-600/70 dark:text-orange-400/70">{scene.endFramePromptZh || scene.endFramePrompt || 'Not set'}</span>
                </p>
              )}
              <p className="text-[10px] truncate flex items-center gap-1.5">
                <span className="shrink-0 inline-flex items-center gap-0.5 text-green-600 dark:text-green-400 font-medium">
                  <Play className="h-2.5 w-2.5" /> Video:
                </span>
                <span className="text-muted-foreground">
                  {scene.videoPromptZh || scene.videoPrompt || 'Not set'}
                {scene.cameraMovement && scene.cameraMovement !== 'none' && (
                    <span className="ml-1 text-green-500/50">[{CAMERA_MOVEMENT_PRESETS.find(p => p.id === scene.cameraMovement)?.label || scene.cameraMovement}]</span>
                  )}
                  {scene.specialTechnique && scene.specialTechnique !== 'none' && (
                    <span className="ml-1 text-purple-500/50">[{SPECIAL_TECHNIQUE_PRESETS.find(p => p.id === scene.specialTechnique)?.label || scene.specialTechnique}]</span>
                  )}
                  {scene.duration && <span className="ml-1 text-green-500/50">{scene.duration}s</span>}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Duration + shot settings + emotion tags (always visible) */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Duration */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground">Duration:</span>
              <DurationSelector
                value={scene.duration || 5}
                onChange={(v) => onUpdateDuration(scene.id, v)}
                disabled={isGeneratingAny}
              />
            </div>
            {/* Camera movement */}
            <div className="flex items-center gap-1">
              <Select
                value={scene.cameraMovement || 'none'}
                onValueChange={(v) => onUpdateField?.(scene.id, 'cameraMovement', v)}
                disabled={isGeneratingAny}
              >
                <SelectTrigger className="h-6 text-[10px] px-1.5 min-w-0 w-auto max-w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_MOVEMENT_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-[11px]">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Special filming technique */}
            <div className="flex items-center gap-1">
              <Select
                value={scene.specialTechnique || 'none'}
                onValueChange={(v) => onUpdateField?.(scene.id, 'specialTechnique', v)}
                disabled={isGeneratingAny}
              >
                <SelectTrigger className="h-6 text-[10px] px-1.5 min-w-0 w-auto max-w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPECIAL_TECHNIQUE_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-[11px]">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Camera angle */}
            <div className="flex items-center gap-1">
              <Select
                value={scene.cameraAngle || 'eye-level'}
                onValueChange={(v) => onUpdateField?.(scene.id, 'cameraAngle', v)}
                disabled={isGeneratingAny}
              >
                <SelectTrigger className="h-6 text-[10px] px-1.5 min-w-0 w-auto max-w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_ANGLE_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-[11px]">
                      {p.emoji} {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Focal length */}
            <div className="flex items-center gap-1">
              <Select
                value={scene.focalLength || '50mm'}
                onValueChange={(v) => onUpdateField?.(scene.id, 'focalLength', v)}
                disabled={isGeneratingAny}
              >
                <SelectTrigger className="h-6 text-[10px] px-1.5 min-w-0 w-auto max-w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOCAL_LENGTH_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-[11px]">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Photography technique */}
            <div className="flex items-center gap-1">
              <Select
                value={scene.photographyTechnique || 'none'}
                onValueChange={(v) => onUpdateField?.(scene.id, 'photographyTechnique', v === 'none' ? undefined : v)}
                disabled={isGeneratingAny}
              >
                <SelectTrigger className="h-6 text-[10px] px-1.5 min-w-0 w-auto max-w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-[11px]">No technique</SelectItem>
                  {PHOTOGRAPHY_TECHNIQUE_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-[11px]">
                      {p.emoji} {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Camera position description (AI-generated free text) */}
          {scene.cameraPosition && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground shrink-0">Position:</span>
              <span className="text-[10px] text-muted-foreground/80 truncate">{scene.cameraPosition}</span>
            </div>
          )}
          {/* Emotion tags */}
          <div>
            <EmotionTags
              value={scene.emotionTags || []}
              onChange={(tags) => onUpdateEmotions(scene.id, tags)}
              disabled={isGeneratingAny}
            />
          </div>
        </div>

        {/* Fourth row: audio controls (ambient / SFX / dialogue) */}
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground mb-0.5 block">Audio controls</Label>
          {/* Ambient */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdateField?.(scene.id, 'audioAmbientEnabled', scene.audioAmbientEnabled === false)}
              disabled={isGeneratingAny}
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded shrink-0 w-12 text-center transition-colors",
                scene.audioAmbientEnabled !== false
                  ? "bg-green-500/20 text-green-600 dark:text-green-400"
                  : "bg-muted text-muted-foreground line-through"
              )}
            >
              Ambient
            </button>
            <input
              type="text"
              value={scene.ambientSound || ''}
              onChange={(e) => onUpdateAmbientSound(scene.id, e.target.value)}
              placeholder="Wind, rain, birdsong..."
              disabled={isGeneratingAny || scene.audioAmbientEnabled === false}
              className="flex-1 h-6 px-1.5 text-[10px] rounded border bg-transparent disabled:opacity-40 placeholder:text-muted-foreground/30"
            />
          </div>
          {/* Sound effects */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdateField?.(scene.id, 'audioSfxEnabled', scene.audioSfxEnabled === false)}
              disabled={isGeneratingAny}
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded shrink-0 w-12 text-center transition-colors",
                scene.audioSfxEnabled !== false
                  ? "bg-green-500/20 text-green-600 dark:text-green-400"
                  : "bg-muted text-muted-foreground line-through"
              )}
            >
              SFX
            </button>
            <input
              type="text"
              value={scene.soundEffectText || ''}
              onChange={(e) => onUpdateField?.(scene.id, 'soundEffectText', e.target.value)}
              placeholder="Footsteps, a closing door..."
              disabled={isGeneratingAny || scene.audioSfxEnabled === false}
              className="flex-1 h-6 px-1.5 text-[10px] rounded border bg-transparent disabled:opacity-40 placeholder:text-muted-foreground/30"
            />
          </div>
          {/* Dialogue */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdateField?.(scene.id, 'audioDialogueEnabled', scene.audioDialogueEnabled === false)}
              disabled={isGeneratingAny}
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded shrink-0 w-12 text-center transition-colors",
                scene.audioDialogueEnabled !== false
                  ? "bg-green-500/20 text-green-600 dark:text-green-400"
                  : "bg-muted text-muted-foreground line-through"
              )}
            >
              Dialogue
            </button>
            <input
              type="text"
              value={scene.dialogue || ''}
              onChange={(e) => onUpdateField?.(scene.id, 'dialogue', e.target.value)}
              placeholder="Character lines..."
              disabled={isGeneratingAny || scene.audioDialogueEnabled === false}
              className="flex-1 h-6 px-1.5 text-[10px] rounded border bg-transparent disabled:opacity-40 placeholder:text-muted-foreground/30"
            />
          </div>
          {/* Background music */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdateField?.(scene.id, 'audioBgmEnabled', !(scene.audioBgmEnabled === true))}
              disabled={isGeneratingAny}
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded shrink-0 w-12 text-center transition-colors",
                scene.audioBgmEnabled === true
                  ? "bg-green-500/20 text-green-600 dark:text-green-400"
                  : "bg-muted text-muted-foreground line-through"
              )}
            >
              Music
            </button>
            <input
              type="text"
              value={scene.backgroundMusic || ''}
              onChange={(e) => onUpdateField?.(scene.id, 'backgroundMusic', e.target.value)}
              placeholder="Background music is off by default; enable and fill this in if needed..."
              disabled={isGeneratingAny || scene.audioBgmEnabled !== true}
              className="flex-1 h-6 px-1.5 text-[10px] rounded border bg-transparent disabled:opacity-40 placeholder:text-muted-foreground/30"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
