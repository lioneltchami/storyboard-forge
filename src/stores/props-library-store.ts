// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * PropsLibraryStore - prop library state management
 * Supports custom folder classification and persistence to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Prop item
export interface PropItem {
  id: string;
    name: string;           // Prop name (editable)
    imageUrl: string;       // local-image://props/... or remote URL
    prompt: string;         // Reference prompt used during generation
    folderId: string | null; // Parent folder, null = root
  createdAt: number;
}

// Custom folder
export interface PropFolder {
  id: string;
    name: string;           // Folder name
    parentId: string | null; // Reserved for nested folders (UI currently uses one level)
  createdAt: number;
}

interface PropsLibraryState {
  items: PropItem[];
  folders: PropFolder[];
  // Currently selected folder (null = all)
  selectedFolderId: string | null | 'all';
}

interface PropsLibraryActions {
  // Prop actions
  addProp: (prop: Omit<PropItem, 'id' | 'createdAt'>) => PropItem;
  renameProp: (id: string, name: string) => void;
  deleteProp: (id: string) => void;
  moveProp: (propId: string, folderId: string | null) => void;

  // Folder actions
  addFolder: (name: string, parentId?: string | null) => PropFolder;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void; // Move child props to the root folder on delete

  // UI state
  setSelectedFolderId: (folderId: string | null | 'all') => void;

  // Queries
  getPropsByFolder: (folderId: string | null | 'all') => PropItem[];
  getPropById: (id: string) => PropItem | undefined;
}

type PropsLibraryStore = PropsLibraryState & PropsLibraryActions;

export const usePropsLibraryStore = create<PropsLibraryStore>()(
  persist(
    (set, get) => ({
      items: [],
      folders: [],
      selectedFolderId: 'all',

      // ── Prop actions ──────────────────────────────────────────────────────

      addProp: (prop) => {
        const newProp: PropItem = {
          ...prop,
          id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          createdAt: Date.now(),
        };
        set((s) => ({ items: [newProp, ...s.items] }));
        return newProp;
      },

      renameProp: (id, name) => {
        set((s) => ({
          items: s.items.map((item) =>
            item.id === id ? { ...item, name } : item
          ),
        }));
      },

      deleteProp: (id) => {
        set((s) => ({ items: s.items.filter((item) => item.id !== id) }));
      },

      moveProp: (propId, folderId) => {
        set((s) => ({
          items: s.items.map((item) =>
            item.id === propId ? { ...item, folderId } : item
          ),
        }));
      },

      // ── Folder actions ────────────────────────────────────────────────────

      addFolder: (name, parentId = null) => {
        const newFolder: PropFolder = {
          id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name,
          parentId,
          createdAt: Date.now(),
        };
        set((s) => ({ folders: [...s.folders, newFolder] }));
        return newFolder;
      },

      renameFolder: (id, name) => {
        set((s) => ({
          folders: s.folders.map((f) =>
            f.id === id ? { ...f, name } : f
          ),
        }));
      },

      deleteFolder: (id) => {
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== id),
          // Move the folder's props to the root folder
          items: s.items.map((item) =>
            item.folderId === id ? { ...item, folderId: null } : item
          ),
          // If this folder is currently selected, switch back to "All"
          selectedFolderId:
            s.selectedFolderId === id ? 'all' : s.selectedFolderId,
        }));
      },

      // ── UI state ──────────────────────────────────────────────────────────

      setSelectedFolderId: (folderId) => {
        set({ selectedFolderId: folderId });
      },

      // ── Queries ───────────────────────────────────────────────────────────

      getPropsByFolder: (folderId) => {
        const { items } = get();
        if (folderId === 'all') return items;
        return items.filter((item) => item.folderId === folderId);
      },

      getPropById: (id) => {
        return get().items.find((item) => item.id === id);
      },
    }),
    {
      name: 'moyin-props-library',
      partialize: (state) => ({
        items: state.items,
        folders: state.folders,
      }),
    }
  )
);
