// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * SaveToPropsDialog - dialog for saving generated images into the props library
 * After generating an image in the image studio, the user can choose a folder and save it.
 */

import { useState } from 'react';
import { usePropsLibraryStore } from '@/stores/props-library-store';
import { saveImageToLocal } from '@/lib/image-storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FolderOpen, FolderPlus, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SaveToPropsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Image URL to save (may be remote) */
  imageUrl: string;
  /** Optional generation prompt */
  prompt?: string;
}

export function SaveToPropsDialog({
  open,
  onOpenChange,
  imageUrl,
  prompt = '',
}: SaveToPropsDialogProps) {
  const { folders, addProp, addFolder, setSelectedFolderId } =
    usePropsLibraryStore();

  const [propName, setPropName] = useState('');
  const [selectedFolderId, setLocalFolderId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const folder = addFolder(trimmed);
    setLocalFolderId(folder.id);
    setNewFolderName('');
    setNewFolderMode(false);
    toast.success(`Folder "${trimmed}" created`);
  };

  const handleSave = async () => {
    const name = propName.trim() || `Prop_${Date.now()}`;
    setSaving(true);
    try {
      // Try to persist locally in Electron; fall back to the original URL in the browser.
      const localPath = await saveImageToLocal(
        imageUrl,
        'props',
        `prop_${Date.now()}.png`
      );
      addProp({
        name,
        imageUrl: localPath,
        prompt,
        folderId: selectedFolderId,
      });
      // Sync the props library sidebar selection to the target folder.
      setSelectedFolderId(selectedFolderId ?? 'all');
      toast.success(`"${name}" saved to the props library`);
      onOpenChange(false);
      // Reset the form.
      setPropName('');
      setLocalFolderId(null);
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onOpenChange(false);
    setPropName('');
    setLocalFolderId(null);
    setNewFolderMode(false);
    setNewFolderName('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Save to Props Library
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Image preview */}
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-lg border border-border bg-muted overflow-hidden">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Prop name */}
          <div className="space-y-1.5">
            <Label htmlFor="prop-name" className="text-xs">
              Prop name
            </Label>
            <Input
              id="prop-name"
              placeholder="Enter a prop name (leave blank to auto-name)"
              value={propName}
              onChange={(e) => setPropName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saving) handleSave();
              }}
            />
          </div>

          {/* Choose a folder */}
          <div className="space-y-1.5">
            <Label className="text-xs">Save to folder</Label>
            <ScrollArea className="max-h-40 rounded-md border border-border">
              <div className="p-1.5 space-y-0.5">
                {/* Root folder */}
                <button
                  className={cn(
                    'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs transition-colors',
                    selectedFolderId === null
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  onClick={() => setLocalFolderId(null)}
                >
                  <Package className="h-3.5 w-3.5 shrink-0" />
                  Root folder (uncategorized)
                </button>

                {/* User folders */}
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    className={cn(
                      'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs transition-colors',
                      selectedFolderId === folder.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                    onClick={() => setLocalFolderId(folder.id)}
                  >
                    <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                    {folder.name}
                  </button>
                ))}

                {/* Inline new-folder input */}
                {newFolderMode ? (
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    <FolderPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      autoFocus
                      placeholder="Folder name..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateFolder();
                        if (e.key === 'Escape') {
                          setNewFolderMode(false);
                          setNewFolderName('');
                        }
                      }}
                      className="h-6 text-xs px-1.5 flex-1"
                    />
                    <Button
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim()}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setNewFolderMode(false);
                        setNewFolderName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t border-border mt-1 pt-2"
                    onClick={() => setNewFolderMode(true)}
                  >
                    <FolderPlus className="h-3.5 w-3.5 shrink-0" />
                    + New folder
                  </button>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
