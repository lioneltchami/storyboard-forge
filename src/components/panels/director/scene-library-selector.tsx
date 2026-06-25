// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * Scene library selector
 * Supports three levels of selection: parent scene -> viewpoint variant -> four-view sub-scene
 */

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, Layers, MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useSceneStore } from "@/stores/scene-store";
import { useResolvedImageUrl } from "@/hooks/use-resolved-image-url";
import { useAppSettingsStore } from "@/stores/app-settings-store";
import { useProjectStore } from "@/stores/project-store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SceneLibrarySelectorProps {
  sceneId: number;
  selectedSceneLibraryId?: string;
  selectedViewpointId?: string;
  selectedSubViewId?: string;  // four-view sub-scene ID
  isEndFrame?: boolean;
  onChange: (
    sceneLibraryId: string | undefined, 
    viewpointId: string | undefined, 
    referenceImage: string | undefined, 
    subViewId?: string
  ) => void;
  disabled?: boolean;
}

/** Resolve a local-image:// thumbnail */
function ResolvedImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const resolved = useResolvedImageUrl(src);
  return <img src={resolved || ''} alt={alt} className={className} />;
}

export function SceneLibrarySelector({
  sceneId: _sceneId,
  selectedSceneLibraryId,
  selectedViewpointId,
  selectedSubViewId,
  isEndFrame = false,
  onChange,
  disabled,
}: SceneLibrarySelectorProps) {
  // sceneId is available for future use (e.g., logging, analytics)
  void _sceneId;
  const [isOpen, setIsOpen] = useState(false);
  const { scenes: libraryScenes } = useSceneStore();
  const { resourceSharing } = useAppSettingsStore();
  const { activeProjectId } = useProjectStore();
  
  const visibleScenes = useMemo(() => {
    if (resourceSharing.shareScenes) return libraryScenes;
    if (!activeProjectId) return [];
    return libraryScenes.filter((s) => s.projectId === activeProjectId);
  }, [libraryScenes, resourceSharing.shareScenes, activeProjectId]);
  
  // Get all parent scenes (non-viewpoint variants)
  const parentScenes = useMemo(() => 
    visibleScenes.filter(s => !s.isViewpointVariant && !s.parentSceneId),
    [visibleScenes]
  );
  
  // Get viewpoint variants for the selected scene (first-level children)
  const viewpointScenes = useMemo(() => {
    if (!selectedSceneLibraryId) return [];
    return visibleScenes.filter(s => s.parentSceneId === selectedSceneLibraryId);
  }, [visibleScenes, selectedSceneLibraryId]);
  
  // Get four-view sub-scenes for the selected viewpoint (second-level children)
  const subViewScenes = useMemo(() => {
    if (!selectedViewpointId) return [];
    return visibleScenes.filter(s => s.parentSceneId === selectedViewpointId);
  }, [visibleScenes, selectedViewpointId]);
  
  // Get the current selection details
  const selectedScene = useMemo(() => {
    if (!selectedSceneLibraryId) return null;
    return visibleScenes.find(s => s.id === selectedSceneLibraryId) || null;
  }, [visibleScenes, selectedSceneLibraryId]);
  
  const selectedViewpoint = useMemo(() => {
    if (!selectedViewpointId) return null;
    return visibleScenes.find(s => s.id === selectedViewpointId) || null;
  }, [visibleScenes, selectedViewpointId]);
  
  const selectedSubView = useMemo(() => {
    if (!selectedSubViewId) return null;
    return visibleScenes.find(s => s.id === selectedSubViewId) || null;
  }, [visibleScenes, selectedSubViewId]);
  
  // Select a scene
  const handleSelectScene = (sceneLibId: string) => {
    const scene = visibleScenes.find(s => s.id === sceneLibId);
    if (!scene) {
      onChange(undefined, undefined, undefined, undefined);
      return;
    }
    // Selecting a scene clears viewpoint and four-view selections
    const refImage = scene.referenceImage || scene.referenceImageBase64;
    onChange(sceneLibId, undefined, refImage, undefined);
  };
  
  // Select a viewpoint
  const handleSelectViewpoint = (viewpointId: string) => {
    const viewpoint = visibleScenes.find(s => s.id === viewpointId);
    if (!viewpoint) {
      // Clear the viewpoint and fall back to the parent scene reference image
      const parentRefImage = selectedScene?.referenceImage || selectedScene?.referenceImageBase64;
      onChange(selectedSceneLibraryId, undefined, parentRefImage, undefined);
      return;
    }
    const refImage = viewpoint.referenceImage || viewpoint.referenceImageBase64;
    onChange(selectedSceneLibraryId, viewpointId, refImage, undefined);
  };
  
  // Select a four-view sub-scene
  const handleSelectSubView = (subViewId: string) => {
    const subView = visibleScenes.find(s => s.id === subViewId);
    if (!subView) {
      // Clear the four-view selection and fall back to the viewpoint reference image
      const viewpointRefImage = selectedViewpoint?.referenceImage || selectedViewpoint?.referenceImageBase64;
      onChange(selectedSceneLibraryId, selectedViewpointId, viewpointRefImage, undefined);
      return;
    }
    const refImage = subView.referenceImage || subView.referenceImageBase64;
    onChange(selectedSceneLibraryId, selectedViewpointId, refImage, subViewId);
  };
  
  // Clear selection
  const handleClear = () => {
    onChange(undefined, undefined, undefined, undefined);
    setIsOpen(false);
  };
  
  // Display text
  const displayText = useMemo(() => {
    if (!selectedScene) return isEndFrame ? "Last frame scene" : "Scene reference";
    if (selectedSubView) {
      return `${selectedScene.name}-${selectedViewpoint?.viewpointName || selectedViewpoint?.name}-${selectedSubView.viewpointName || selectedSubView.name}`;
    }
    if (selectedViewpoint) return `${selectedScene.name}-${selectedViewpoint.viewpointName || selectedViewpoint.name}`;
    return selectedScene.name;
  }, [selectedScene, selectedViewpoint, selectedSubView, isEndFrame]);
  
  // Whether anything is selected
  const hasSelection = !!selectedSceneLibraryId;
  
  // Reference preview image (lifted to component scope so the hook can be used)
  const previewRefImage = selectedSubView?.referenceImage || selectedSubView?.referenceImageBase64
    || selectedViewpoint?.referenceImage || selectedViewpoint?.referenceImageBase64
    || selectedScene?.referenceImage || (selectedScene as any)?.contactSheetImage || selectedScene?.referenceImageBase64
    || null;
  const resolvedPreview = useResolvedImageUrl(previewRefImage);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded border border-dashed text-xs transition-colors disabled:opacity-50",
            hasSelection 
              ? "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
              : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-foreground"
          )}
        >
          <Layers className="h-3 w-3" />
          <span className="max-w-[80px] truncate">{displayText}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[720px] p-3" align="start">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">
            {isEndFrame ? "Select last-frame scene reference" : "Select scene reference"}
          </p>
          {hasSelection && (
            <button
              onClick={handleClear}
              className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80"
            >
              Clear selection
            </button>
          )}
        </div>

        {parentScenes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            The scene library is empty. Create a scene first.
          </p>
        ) : (
          <div className="flex gap-3">
            {/* Left side: scene / viewpoint / four-view columns */}
            <div className="flex gap-3 flex-1">
              {/* Scene selection - first column */}
              <div className="w-[160px] shrink-0">
                <Label className="text-xs text-muted-foreground mb-2 block">Scene</Label>
                <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                  {parentScenes.map((s) => {
                    const isSelected = selectedSceneLibraryId === s.id;
                    const thumbnail = s.referenceImage || (s as any).contactSheetImage || s.referenceImageBase64;
                    const hasViewpoints = libraryScenes.some(v => v.parentSceneId === s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSelectScene(s.id)}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded text-left transition-colors",
                          isSelected ? "bg-primary/15 ring-1 ring-primary/50" : "hover:bg-muted"
                        )}
                      >
                      {thumbnail ? (
                          <ResolvedImg src={thumbnail} alt={s.name} className="w-12 h-12 rounded object-contain bg-muted shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                            <Layers className="h-4 w-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-xs truncate block">{s.name}</span>
                          {hasViewpoints && (
                            <span className="text-[10px] text-muted-foreground">Has viewpoints</span>
                          )}
                        </div>
                        {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Viewpoint selection - second column, if available */}
              {selectedSceneLibraryId && viewpointScenes.length > 0 && (
                <div className="w-[140px] shrink-0 border-l pl-3">
                  <Label className="text-xs text-muted-foreground mb-2 block">Viewpoint</Label>
                  <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                    <button
                      onClick={() => handleSelectViewpoint('')}
                      className={cn(
                        "w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors",
                        !selectedViewpointId ? "bg-primary/15 ring-1 ring-primary/50" : "hover:bg-muted"
                      )}
                    >
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <MapPin className="h-3 w-3" />
                      </div>
                      <span className="text-xs">Unspecified</span>
                      {!selectedViewpointId && <Check className="h-3 w-3 text-primary" />}
                    </button>
                    {viewpointScenes.map((v) => {
                      const isSelected = selectedViewpointId === v.id;
                      const thumbnail = v.referenceImage || v.referenceImageBase64;
                      const hasSubViews = libraryScenes.some(sub => sub.parentSceneId === v.id);
                      return (
                        <button
                          key={v.id}
                          onClick={() => handleSelectViewpoint(v.id)}
                          className={cn(
                            "w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors",
                            isSelected ? "bg-primary/15 ring-1 ring-primary/50" : "hover:bg-muted"
                          )}
                        >
                          {thumbnail ? (
                            <ResolvedImg src={thumbnail} alt={v.viewpointName || v.name} className="w-8 h-8 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                              <MapPin className="h-3 w-3" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs truncate block">{v.viewpointName || v.name}</span>
                            {hasSubViews && (
                            <span className="text-[10px] text-muted-foreground">Has four-view variants</span>
                            )}
                          </div>
                          {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Four-view sub-scene selection - third column, if available */}
              {selectedViewpointId && subViewScenes.length > 0 && (
                <div className="w-[120px] shrink-0 border-l pl-3">
                  <Label className="text-xs text-muted-foreground mb-2 block">Four-view</Label>
                  <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                    <button
                      onClick={() => handleSelectSubView('')}
                      className={cn(
                        "w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors",
                        !selectedSubViewId ? "bg-primary/15 ring-1 ring-primary/50" : "hover:bg-muted"
                      )}
                    >
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <Layers className="h-3 w-3" />
                      </div>
                      <span className="text-xs">Unspecified</span>
                      {!selectedSubViewId && <Check className="h-3 w-3 text-primary" />}
                    </button>
                    {subViewScenes.map((sv) => {
                      const isSelected = selectedSubViewId === sv.id;
                      const thumbnail = sv.referenceImage || sv.referenceImageBase64;
                      return (
                        <button
                          key={sv.id}
                          onClick={() => handleSelectSubView(sv.id)}
                          className={cn(
                            "w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors",
                            isSelected ? "bg-primary/15 ring-1 ring-primary/50" : "hover:bg-muted"
                          )}
                        >
                          {thumbnail ? (
                            <ResolvedImg src={thumbnail} alt={sv.viewpointName || sv.name} className="w-8 h-8 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                              <Layers className="h-3 w-3" />
                            </div>
                          )}
                          <span className="flex-1 text-xs truncate">{sv.viewpointName || sv.name}</span>
                          {isSelected && <Check className="h-3 w-3 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right side: reference image preview */}
            <div className="w-[240px] shrink-0 border-l pl-3">
              <Label className="text-xs text-muted-foreground mb-2 block">Reference Preview</Label>
              {previewRefImage ? (
                <div className="w-full rounded-lg bg-muted flex items-center justify-center min-h-[120px] max-h-[240px] overflow-hidden">
                  <ResolvedImg src={previewRefImage} alt="Reference image" className="max-w-full max-h-[240px] rounded-lg object-contain" />
                </div>
              ) : (
                <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">Please select a scene</span>
                </div>
              )}
              {/* Selected path display */}
              {hasSelection && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <span className="text-foreground">{selectedScene?.name}</span>
                  {selectedViewpoint && (
                    <> › <span className="text-foreground">{selectedViewpoint.viewpointName || selectedViewpoint.name}</span></>
                  )}
                  {selectedSubView && (
                    <> › <span className="text-foreground">{selectedSubView.viewpointName || selectedSubView.name}</span></>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
