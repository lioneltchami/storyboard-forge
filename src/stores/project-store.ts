// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { fileStorage } from "@/lib/indexed-db-storage";
import { generateUUID } from "@/lib/utils";

export const DEFAULT_FPS = 30;

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  createProject: (name?: string) => Project;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  ensureDefaultProject: () => void;
}

type PersistedProjectStore = {
  projects?: Project[];
  activeProjectId?: string | null;
};

// Default project for the desktop app
const DEFAULT_PROJECT: Project = {
  id: "default-project",
  name: "Storyboard Forge Project",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [DEFAULT_PROJECT],
      activeProjectId: DEFAULT_PROJECT.id,
      activeProject: DEFAULT_PROJECT,

      ensureDefaultProject: () => {
        const { projects, activeProjectId } = get();
        if (projects.length === 0) {
          set({
            projects: [DEFAULT_PROJECT],
            activeProjectId: DEFAULT_PROJECT.id,
            activeProject: DEFAULT_PROJECT,
          });
          return;
        }
        if (!activeProjectId) {
          set({
            activeProjectId: projects[0].id,
            activeProject: projects[0],
          });
        }
      },

      createProject: (name) => {
        const newProject: Project = {
          id: generateUUID(),
          name: name?.trim() || `New Project ${new Date().toLocaleDateString("en-CA")}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          projects: [newProject, ...state.projects],
          // Do not set activeProjectId here; switchProject() handles that centrally.
          // This avoids skipping rehydration when the ID is already the same.
        }));
        return newProject;
      },

      renameProject: (id, name) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p
          ),
          activeProject:
            state.activeProject?.id === id
              ? { ...state.activeProject, name, updatedAt: Date.now() }
              : state.activeProject,
        }));
      },

      deleteProject: (id) => {
        set((state) => {
          const remaining = state.projects.filter((p) => p.id !== id);
          const nextActive =
            state.activeProjectId === id ? remaining[0] || null : state.activeProject;
          return {
            projects: remaining,
            activeProjectId: nextActive?.id || null,
            activeProject: nextActive,
          };
        });
        // Clean up the per-project storage directory
        if (window.fileStorage?.removeDir) {
          window.fileStorage.removeDir(`_p/${id}`).catch((err: unknown) =>
            console.warn(`[ProjectStore] Failed to remove project dir _p/${id}:`, err)
          );
        }
      },

      setActiveProject: (id) => {
        set((state) => {
          const project = state.projects.find((p) => p.id === id) || null;
          return {
            activeProjectId: project?.id || null,
            activeProject: project,
          };
        });
      },
    }),
    {
      name: "moyin-project-store",
      storage: createJSONStorage(() => fileStorage),
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
      migrate: (persistedState: unknown, _version: number) => {
        const persisted = persistedState as PersistedProjectStore | undefined;
        if (persisted?.projects && persisted.projects.length > 0) {
          return persisted;
        }
        return {
          projects: [DEFAULT_PROJECT],
          activeProjectId: DEFAULT_PROJECT.id,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const project =
          state.projects.find((p) => p.id === state.activeProjectId) ||
          state.projects[0] ||
          null;
        state.activeProjectId = project?.id || null;
        state.activeProject = project;

        // Asynchronously scan the _p/ directory and restore any missing projects.
        // This fixes empty project lists after path changes, imports, or migrations.
        discoverProjectsFromDisk().catch((err) =>
          console.warn('[ProjectStore] Disk discovery failed:', err)
        );
      },
    }
  )
);

/**
 * 扫描磁盘上 _p/ 目录下的实际项目文件夹，
 * 将未在 projects 列表中注册的项目自动恢复。
 * 
 * 解决以下场景：
 * - 更改存储路径并迁移数据后，前端 store 未 reload，或 moyin-project-store.json
 *   中的 projects 列表不完整（旧版本、手动复制等）
 * - 导入数据后 moyin-project-store.json 缺失或不含新项目
 * - 换电脑后指向旧数据目录，projects 列表为空
 */
async function discoverProjectsFromDisk(): Promise<void> {
  if (!window.fileStorage?.listDirs) return;

  try {
    // List every subdirectory under _p/ (each folder name is a projectId)
    const diskProjectIds = await window.fileStorage.listDirs('_p');
    if (!diskProjectIds || diskProjectIds.length === 0) return;

    const { projects } = useProjectStore.getState();
    const knownIds = new Set(projects.map((p) => p.id));

    const missingIds = diskProjectIds.filter((id) => !knownIds.has(id));
    if (missingIds.length === 0) return;

    console.log(
      `[ProjectStore] Found ${missingIds.length} projects on disk not in store:`,
      missingIds.map((id) => id.substring(0, 8))
    );

      // Try to extract project names from each missing project's director/script files
      const recoveredProjects: Project[] = [];
      for (const pid of missingIds) {
        let name = `Recovered Project (${pid.substring(0, 8)})`;
      const createdAt = Date.now();

      // Try to get the name from the script file
      try {
        const scriptCandidates = [
          `_p/${pid}/script`,
          `_p/${pid}/script-store`,
        ];
        for (const scriptKey of scriptCandidates) {
          const scriptRaw = await window.fileStorage.getItem(scriptKey);
          if (!scriptRaw) continue;
          const parsed = JSON.parse(scriptRaw);
          const state = parsed?.state ?? parsed;
          // The script store's projects field may contain project info
          if (state?.projects?.[pid]?.title) {
            name = state.projects[pid].title;
            break;
          }
        }
      } catch { /* ignore */ }

      // Try to read creation time and similar metadata from the director file
      try {
        const directorCandidates = [
          `_p/${pid}/director`,
          `_p/${pid}/director-store`,
        ];
        for (const directorKey of directorCandidates) {
          const directorRaw = await window.fileStorage.getItem(directorKey);
          if (!directorRaw) continue;
          const parsed = JSON.parse(directorRaw);
          const state = parsed?.state ?? parsed;
          if (state?.projects?.[pid]?.screenplay) {
            // Script content means this is a valid project
            const screenplay = state.projects[pid].screenplay;
            if (!name.includes('Recovered Project')) {
              // Already has a name, do not overwrite it
            } else if (screenplay) {
              // Use the first few words of the script as a temporary name
              const preview = screenplay.substring(0, 20).replace(/\n/g, ' ').trim();
              if (preview) name = preview + '...';
            }
            break;
          }
        }
      } catch { /* ignore */ }

      recoveredProjects.push({
        id: pid,
        name,
        createdAt,
        updatedAt: Date.now(),
      });
    }

    if (recoveredProjects.length > 0) {
      useProjectStore.setState((state) => ({
        projects: [...state.projects, ...recoveredProjects],
      }));
      console.log(
        `[ProjectStore] Recovered ${recoveredProjects.length} projects from disk:`,
        recoveredProjects.map((p) => `${p.id.substring(0, 8)}:${p.name}`)
      );
    }
  } catch (err) {
    console.error('[ProjectStore] discoverProjectsFromDisk error:', err);
  }
}
