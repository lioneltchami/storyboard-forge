// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * StyleEditor - Custom style editor
 * Create or edit custom styles with reference image uploads.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useCustomStyleStore, type CustomStyle } from "@/stores/custom-style-store";
import { saveImageToLocal } from "@/lib/image-storage";
import { extractStyleTokens } from "@/lib/ai/style-extractor";
import { LocalImage } from "@/components/ui/local-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ImagePlus, Save, ArrowLeft, Trash2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StyleEditorProps {
  styleId: string | null; // null or 'new' = create, otherwise edit
  onClose: () => void;
}

interface FormData {
  name: string;
  prompt: string;
  negativePrompt: string;
  description: string;
  referenceImages: string[];
  tags: string[];
  styleTokens: string;
  sceneTokens: string;
}

const emptyForm: FormData = {
  name: "",
  prompt: "",
  negativePrompt: "",
  description: "",
  referenceImages: [],
  tags: [],
  styleTokens: "",
  sceneTokens: "",
};

export function StyleEditor({ styleId, onClose }: StyleEditorProps) {
  const { styles, addStyle, updateStyle } = useCustomStyleStore();
  const isNew = !styleId || styleId === "new";
  const existing = isNew ? null : styles.find((s) => s.id === styleId);

  const [form, setForm] = useState<FormData>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing data
  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        prompt: existing.prompt,
        negativePrompt: existing.negativePrompt,
        description: existing.description,
        referenceImages: [...existing.referenceImages],
        tags: [...existing.tags],
        styleTokens: existing.styleTokens || "",
        sceneTokens: existing.sceneTokens || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [existing]);

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Convert a File to a data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Upload reference images
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newImages: string[] = [];
      for (const file of Array.from(files)) {
        // Convert to a data URL before saving to avoid Electron's blob: support issues
        const dataUrl = await fileToDataUrl(file);
        const filename = `style_ref_${Date.now()}_${file.name}`;
        const localPath = await saveImageToLocal(dataUrl, "styles", filename);
        newImages.push(localPath);
      }
      setForm((prev) => ({
        ...prev,
        referenceImages: [...prev.referenceImages, ...newImages],
      }));
    } catch (err) {
      console.error("Failed to upload images:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Remove a reference image
  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      referenceImages: prev.referenceImages.filter((_, i) => i !== index),
    }));
  };

  // AI style token extraction
  const handleExtractStyle = async () => {
    if (!form.prompt.trim() && form.referenceImages.length === 0) {
      toast.warning("Enter a style description or upload a reference image first");
      return;
    }
    setExtracting(true);
    try {
      const result = await extractStyleTokens(form.prompt, form.referenceImages);
      setForm((prev) => ({
        ...prev,
        styleTokens: result.styleTokens,
        sceneTokens: result.sceneTokens,
        description: prev.description || result.summaryZh,
      }));
      toast.success("Style extraction complete");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      toast.error(msg);
    } finally {
      setExtracting(false);
    }
  };

  // Save
  const handleSave = () => {
    if (!form.name.trim()) return;

    const styleData = {
      name: form.name.trim(),
      prompt: form.prompt,
      negativePrompt: form.negativePrompt,
      description: form.description,
      referenceImages: form.referenceImages,
      tags: form.tags,
      styleTokens: form.styleTokens || undefined,
      sceneTokens: form.sceneTokens || undefined,
    };

    if (isNew) {
      addStyle({ ...styleData, folderId: null });
    } else if (existing) {
      updateStyle(existing.id, styleData);
    }
    onClose();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-sm font-semibold flex-1">
          {isNew ? "New Style" : "Edit Style"}
        </h2>
        <Button size="sm" onClick={handleSave} disabled={!form.name.trim()}>
          <Save className="w-3.5 h-3.5 mr-1.5" />
          Save
        </Button>
      </div>

      {/* Form area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Style name */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Style name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Name this style"
              className="h-8 text-sm"
            />
          </div>

          {/* Style prompt */}
          <div className="space-y-1.5">
            <Label className="text-xs">Style prompt</Label>
            <textarea
              value={form.prompt}
              onChange={(e) => updateField("prompt", e.target.value)}
              placeholder="Enter style keywords in any language, e.g. anime style, soft lighting, pastel colors"
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
          </div>

          {/* AI extraction button */}
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs border-primary/30 hover:border-primary/60"
              onClick={handleExtractStyle}
              disabled={extracting || (!form.prompt.trim() && form.referenceImages.length === 0)}
            >
              {extracting ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Extracting...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Extract style tokens with AI</>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1">
              Separates "visual style" and "scene content" from the description and reference images using the image-understanding service
            </p>
          </div>

          {/* Extraction result: styleTokens */}
          {form.styleTokens && (
            <div className="space-y-1.5">
              <Label className="text-xs text-primary">✨ Visual style tokens (for character/scene concept art)</Label>
              <textarea
                value={form.styleTokens}
                onChange={(e) => updateField("styleTokens", e.target.value)}
                className="w-full min-h-[60px] rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-y"
              />
            </div>
          )}

          {/* Extraction result: sceneTokens */}
          {form.sceneTokens && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">🎬 Scene/composition tokens (for the director board / shot breakdown)</Label>
              <textarea
                value={form.sceneTokens}
                onChange={(e) => updateField("sceneTokens", e.target.value)}
                className="w-full min-h-[60px] rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </div>
          )}

          {/* Negative prompt */}
          <div className="space-y-1.5">
            <Label className="text-xs">Negative prompt</Label>
            <textarea
              value={form.negativePrompt}
              onChange={(e) => updateField("negativePrompt", e.target.value)}
              placeholder="Elements you do not want to appear, e.g. blurry, low quality, watermark"
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Briefly describe this style so it is easy to find later"
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
          </div>

          {/* Reference image upload */}
          <div className="space-y-1.5">
            <Label className="text-xs">Reference images</Label>
            <div className="space-y-2">
              {/* Uploaded images */}
              {form.referenceImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {form.referenceImages.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-border group">
                      <LocalImage
                        src={img}
                        alt={`Reference image ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(i)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <ImagePlus className="w-3.5 h-3.5 mr-1.5" />
                {uploading ? "Uploading..." : "Add reference images"}
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
