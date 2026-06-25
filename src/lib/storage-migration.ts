// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Storage Migration: Monolithic → Per-Project Files
 * 
 * Splits old single-file stores into per-project directories:
 *   _p/{projectId}/script.json, director.json, media.json, characters.json, scenes.json
 *   _shared/media.json, characters.json, scenes.json
 * 
 * Safe: creates new files first, then renames old files to .bak
 * Idempotent: checks _p/.migrated flag before running
 */

import { fileStorage } from './indexed-db-storage';
import bundledDemoProjectStore from '../../demo-data/projects/moyin-project-store.json';
import bundledDemoCharacterLibrary from '../../demo-data/projects/moyin-character-library.json';
import bundledDemoScript from '../../demo-data/projects/_p/a4bbe260-0127-49c7-9230-e766402663c7/script.json';
import bundledDemoDirector from '../../demo-data/projects/_p/a4bbe260-0127-49c7-9230-e766402663c7/director.json';
import bundledDemoScenes from '../../demo-data/projects/_p/a4bbe260-0127-49c7-9230-e766402663c7/scenes.json';
import bundledDemoSclass from '../../demo-data/projects/_p/a4bbe260-0127-49c7-9230-e766402663c7/sclass.json';
import bundledDemoMedia from '../../demo-data/projects/_p/a4bbe260-0127-49c7-9230-e766402663c7/media.json';
import bundledDemoCharacters from '../../demo-data/projects/_p/a4bbe260-0127-49c7-9230-e766402663c7/characters.json';

const MIGRATION_FLAG_KEY = '_p/_migrated';
const DEMO_ENGLISH_MIGRATION_FLAG_KEY = '_p/_demo_english_migrated';
const DEMO_PROJECT_ID = 'a4bbe260-0127-49c7-9230-e766402663c7';

function hasChineseText(value: unknown): boolean {
  return typeof value === 'string' && /[\u4e00-\u9fff]/.test(value);
}

function containsChinese(value: unknown): boolean {
  if (typeof value === 'string') return hasChineseText(value);
  if (Array.isArray(value)) return value.some(containsChinese);
  if (value && typeof value === 'object') {
    return Object.values(value).some(containsChinese);
  }
  return false;
}

function readState(payload: any): any {
  return payload?.state ?? payload;
}

async function writeProjectJson(key: string, value: unknown): Promise<void> {
  await window.fileStorage!.setItem(key, JSON.stringify(value));
}

async function migrateSeededDemoProjectToEnglish(): Promise<void> {
  if (!window.fileStorage) return;

  try {
    if (await window.fileStorage.exists(DEMO_ENGLISH_MIGRATION_FLAG_KEY)) {
      return;
    }
  } catch {
    // If exists() is unavailable, continue and inspect the data directly.
  }

  const projectStoreRaw = await window.fileStorage.getItem('moyin-project-store');
  if (!projectStoreRaw) return;

  let currentProjectStore: any;
  try {
    currentProjectStore = JSON.parse(projectStoreRaw);
  } catch (error) {
    console.warn('[Migration] Failed to parse project store while checking demo locale:', error);
    return;
  }

  const currentProjectStoreState = readState(currentProjectStore);
  const currentDemoProject = currentProjectStoreState?.projects?.find?.((project: any) => project?.id === DEMO_PROJECT_ID);
  const referenceProjectStoreState = readState(bundledDemoProjectStore);
  const referenceDemoProject = referenceProjectStoreState?.projects?.find?.((project: any) => project?.id === DEMO_PROJECT_ID);

  const projectKeys = ['script', 'director', 'scenes', 'sclass', 'media', 'characters'] as const;
  const currentProjectPayloads = await Promise.all(
    projectKeys.map(async (key) => {
      const raw = await window.fileStorage.getItem(`_p/${DEMO_PROJECT_ID}/${key}`);
      return [key, raw] as const;
    })
  );

  const hasLegacyChinese =
    Boolean(currentDemoProject && hasChineseText(currentDemoProject.name)) ||
    currentProjectPayloads.some(([, raw]) => {
      if (!raw) return false;
      try {
        return containsChinese(JSON.parse(raw));
      } catch {
        return false;
      }
    });

  if (!hasLegacyChinese) {
    await writeProjectJson(DEMO_ENGLISH_MIGRATION_FLAG_KEY, {
      migratedAt: new Date().toISOString(),
      demoProjectId: DEMO_PROJECT_ID,
      skipped: true,
    });
    console.log('[Migration] Demo project already English; skipping locale repair.');
    return;
  }

  console.log('[Migration] Repairing seeded demo project locale from bundled English fixtures...');

  const projectPayloads: Record<string, any> = {
    script: bundledDemoScript,
    director: bundledDemoDirector,
    scenes: bundledDemoScenes,
    sclass: bundledDemoSclass,
    media: bundledDemoMedia,
    characters: bundledDemoCharacters,
  };

  for (const [key, payload] of Object.entries(projectPayloads)) {
    await writeProjectJson(`_p/${DEMO_PROJECT_ID}/${key}`, payload);
  }

  if (currentProjectStoreState?.projects && referenceDemoProject) {
    const nextProjects = currentProjectStoreState.projects.map((project: any) => (
      project?.id === DEMO_PROJECT_ID
        ? {
            ...project,
            name: referenceDemoProject.name,
            createdAt: referenceDemoProject.createdAt ?? project.createdAt,
            updatedAt: referenceDemoProject.updatedAt ?? project.updatedAt,
          }
        : project
    ));

    await writeProjectJson('moyin-project-store', {
      ...currentProjectStore,
      state: {
        ...currentProjectStoreState,
        projects: nextProjects,
        activeProjectId: currentProjectStoreState.activeProjectId ?? referenceDemoProject.id,
      },
    });
  }

  const currentCharacterLibraryRaw = await window.fileStorage.getItem('moyin-character-library');
  if (currentCharacterLibraryRaw) {
    try {
      const currentCharacterLibrary = JSON.parse(currentCharacterLibraryRaw);
      const currentCharacterState = readState(currentCharacterLibrary);
      const referenceCharacterState = readState(bundledDemoCharacterLibrary);

      if (currentCharacterState?.characters && Array.isArray(referenceCharacterState?.characters)) {
        const referenceDemoCharacters = referenceCharacterState.characters.filter((character: any) => character?.projectId === DEMO_PROJECT_ID);
        const referenceDemoCharacterIds = new Set(referenceDemoCharacters.map((character: any) => character.id));

        const nextCharacters = [
          ...currentCharacterState.characters.filter((character: any) => (
            character?.projectId !== DEMO_PROJECT_ID && !referenceDemoCharacterIds.has(character?.id)
          )),
          ...referenceDemoCharacters,
        ];

        await writeProjectJson('moyin-character-library', {
          ...currentCharacterLibrary,
          state: {
            ...currentCharacterState,
            characters: nextCharacters,
          },
        });
      }
    } catch (error) {
      console.warn('[Migration] Failed to normalize character library for demo project:', error);
    }
  }

  await writeProjectJson(DEMO_ENGLISH_MIGRATION_FLAG_KEY, {
    migratedAt: new Date().toISOString(),
    demoProjectId: DEMO_PROJECT_ID,
    source: 'bundled-demo-data',
  });
  console.log('[Migration] Seeded demo project locale repair complete.');
}

/**
 * Run migration if needed. Should be called early in app initialization,
 * before stores rehydrate from the new per-project paths.
 */
export async function migrateToProjectStorage(): Promise<void> {
  // Only run in Electron
  if (!window.fileStorage) return;

  await migrateSeededDemoProjectToEnglish();

  // Check migration flag
  try {
    const flagExists = await window.fileStorage.exists(MIGRATION_FLAG_KEY);
    if (flagExists) {
      console.log('[Migration] Already migrated, skipping.');
      return;
    }
  } catch {
    // exists() not available, check by trying to read
    const flag = await fileStorage.getItem(MIGRATION_FLAG_KEY);
    if (flag) return;
  }

  console.log('[Migration] Starting per-project migration...');

  try {

    // 1. Read project index to get all project IDs
    const projectStoreRaw = await fileStorage.getItem('moyin-project-store');
    if (!projectStoreRaw) {
      console.log('[Migration] No project store found, nothing to migrate.');
      await writeMigrationFlag();
      return;
    }

    const projectStoreData = JSON.parse(projectStoreRaw);
    const projectState = projectStoreData.state ?? projectStoreData;
    const projectIds: string[] = (projectState.projects ?? []).map((p: any) => p.id);

    if (projectIds.length === 0) {
      console.log('[Migration] No projects found, nothing to migrate.');
      await writeMigrationFlag();
      return;
    }

    console.log(`[Migration] Found ${projectIds.length} projects: ${projectIds.map(id => id.substring(0, 8)).join(', ')}`);

    // 2. Migrate Record-based stores (script, director)
    await migrateRecordStore('moyin-script-store', 'script');
    await migrateRecordStore('moyin-director-store', 'director');

    // 3. Migrate flat-array stores (media, characters, scenes)
    await migrateFlatStore('moyin-media-store', 'media', projectIds, {
      arrayKeys: ['mediaFiles', 'folders'],
      projectIdField: 'projectId',
      sharedFilter: (item: any, key: string) => {
        if (key === 'folders') return item.isSystem || !item.projectId;
        return !item.projectId;
      },
    });

    await migrateFlatStore('moyin-character-library', 'characters', projectIds, {
      arrayKeys: ['characters', 'folders'],
      projectIdField: 'projectId',
      sharedFilter: (item: any) => !item.projectId,
    });

    await migrateFlatStore('moyin-scene-store', 'scenes', projectIds, {
      arrayKeys: ['scenes', 'folders'],
      projectIdField: 'projectId',
      sharedFilter: (item: any) => !item.projectId,
    });

    // 4. Migrate timeline (simple: whole state is project-scoped, assign to active project)
    await migrateTimelineStore(projectState.activeProjectId || projectIds[0]);

    // 5. Write migration flag
    await writeMigrationFlag();

    // 6. Rename old files to .bak (via a special IPC or just leave them)
    // The old files will be ignored by the new storage adapters since they check _p/ first
    console.log('[Migration] ✅ Migration complete! Old files remain as fallback.');

  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error);
    // Don't write flag - will retry on next startup
  }
}

// ==================== Record Store Migration ====================

async function migrateRecordStore(
  legacyKey: string,
  storeName: string,
): Promise<void> {
  const raw = await fileStorage.getItem(legacyKey);
  if (!raw) {
    console.log(`[Migration] ${legacyKey} not found, skipping.`);
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const state = parsed.state ?? parsed;
    const projects = state.projects;

    if (!projects || typeof projects !== 'object') {
      console.log(`[Migration] ${legacyKey} has no projects record, skipping.`);
      return;
    }

    let migratedCount = 0;
    for (const pid of Object.keys(projects)) {
      const projectData = projects[pid];
      if (!projectData) continue;

      const key = `_p/${pid}/${storeName}`;
      const payload = JSON.stringify({
        state: {
          activeProjectId: pid,
          projectData,
          // For director-store, also include config
          ...(state.config ? { config: state.config } : {}),
        },
        version: parsed.version ?? 0,
      });

      await fileStorage.setItem(key, payload);
      migratedCount++;
    }

    console.log(`[Migration] ${legacyKey}: migrated ${migratedCount} projects to per-project files.`);
  } catch (error) {
    console.error(`[Migration] Failed to migrate ${legacyKey}:`, error);
  }
}

// ==================== Flat Array Store Migration ====================

interface FlatMigrationConfig {
  arrayKeys: string[];        // e.g., ['mediaFiles', 'folders']
  projectIdField: string;     // e.g., 'projectId'
  sharedFilter: (item: any, arrayKey: string) => boolean;
}

async function migrateFlatStore(
  legacyKey: string,
  storeName: string,
  projectIds: string[],
  config: FlatMigrationConfig,
): Promise<void> {
  const raw = await fileStorage.getItem(legacyKey);
  if (!raw) {
    console.log(`[Migration] ${legacyKey} not found, skipping.`);
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const state = parsed.state ?? parsed;
    const version = parsed.version ?? 0;

    // Collect shared items
    const sharedState: Record<string, any[]> = {};
    for (const key of config.arrayKeys) {
      const arr = state[key] ?? [];
      sharedState[key] = arr.filter((item: any) => config.sharedFilter(item, key));
    }

    // Write shared file
    const sharedKey = `_shared/${storeName}`;
    await fileStorage.setItem(sharedKey, JSON.stringify({ state: sharedState, version }));

    // Group by projectId and write per-project files
    let migratedCount = 0;
    for (const pid of projectIds) {
      const projectState: Record<string, any[]> = {};
      let hasData = false;

      for (const key of config.arrayKeys) {
        const arr = state[key] ?? [];
        const projectItems = arr.filter((item: any) => {
          // For folders, system folders go to shared (already handled above)
          if (key === 'folders' && item.isSystem) return false;
          return item[config.projectIdField] === pid;
        });
        projectState[key] = projectItems;
        if (projectItems.length > 0) hasData = true;
      }

      if (hasData) {
        const projectKey = `_p/${pid}/${storeName}`;
        await fileStorage.setItem(projectKey, JSON.stringify({ state: projectState, version }));
        migratedCount++;
      }
    }

    console.log(`[Migration] ${legacyKey}: migrated ${migratedCount} project files + 1 shared file.`);
  } catch (error) {
    console.error(`[Migration] Failed to migrate ${legacyKey}:`, error);
  }
}

// ==================== Timeline Store Migration ====================

async function migrateTimelineStore(activeProjectId: string): Promise<void> {
  const raw = await fileStorage.getItem('moyin-timeline-store');
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    const state = parsed.state ?? parsed;
    
    // Timeline has no projectId - assign entire state to active project
    if (state.clips && state.clips.length > 0) {
      const key = `_p/${activeProjectId}/timeline`;
      await fileStorage.setItem(key, raw);
      console.log(`[Migration] Timeline: migrated ${state.clips.length} clips to project ${activeProjectId.substring(0, 8)}`);
    }
  } catch (error) {
    console.error('[Migration] Failed to migrate timeline:', error);
  }
}

// ==================== Data Recovery ====================

/**
 * Recover per-project data that was overwritten by the switchProject() bug.
 * 
 * Bug: switchProject() called setActiveProjectId() BEFORE rehydrate(), which triggered
 * persist writes that overwrote per-project files with empty/default data.
 * 
 * Recovery: compare per-project files against legacy monolithic files.
 * If legacy has richer data, overwrite the per-project file.
 * 
 * This runs on every startup (fast: only reads and compares when needed).
 */
export async function recoverFromLegacy(): Promise<void> {
  if (!window.fileStorage) return;

  // Only run if migration has already happened
  try {
    const flagExists = await window.fileStorage.exists(MIGRATION_FLAG_KEY);
    if (!flagExists) return; // Migration hasn't run yet, nothing to recover
  } catch {
    return;
  }

  console.log('[Recovery] Checking for data that needs recovery from legacy files...');

  try {
    // Recover Record-based stores
    await recoverRecordStore('moyin-script-store', 'script', isScriptDataRich);
    await recoverRecordStore('moyin-director-store', 'director', isDirectorDataRich);

    console.log('[Recovery] Recovery check complete.');
  } catch (error) {
    console.error('[Recovery] Recovery failed:', error);
  }
}

/** Check if script project data has meaningful content */
function isScriptDataRich(data: any): boolean {
  if (!data) return false;
  if (data.rawScript && data.rawScript.length > 10) return true;
  if (data.shots && data.shots.length > 0) return true;
  if (data.scriptData && data.scriptData.episodes && data.scriptData.episodes.length > 0) return true;
  if (data.episodeRawScripts && data.episodeRawScripts.length > 0) return true;
  return false;
}

/** Check if director project data has meaningful content */
function isDirectorDataRich(data: any): boolean {
  if (!data) return false;
  if (data.splitScenes && data.splitScenes.length > 0) return true;
  if (data.screenplay) return true;
  if (data.storyboardImage) return true;
  return false;
}

/**
 * Compare legacy monolithic store with per-project files.
 * If legacy has richer data for a project, restore it.
 */
async function recoverRecordStore(
  legacyKey: string,
  storeName: string,
  isRich: (data: any) => boolean,
): Promise<void> {
  // Read legacy monolithic file directly from file system (bypass indexed-db-storage adapter)
  const legacyRaw = await window.fileStorage!.getItem(legacyKey);
  if (!legacyRaw) return;

  try {
    const parsed = JSON.parse(legacyRaw);
    const state = parsed.state ?? parsed;
    const projects = state.projects;

    if (!projects || typeof projects !== 'object') return;

    let recoveredCount = 0;

    for (const pid of Object.keys(projects)) {
      const legacyData = projects[pid];
      if (!legacyData || !isRich(legacyData)) continue;

      // Read current per-project file
      const projectKey = `_p/${pid}/${storeName}`;
      const currentRaw = await window.fileStorage!.getItem(projectKey);

      // Check if current per-project data is empty/default
      let currentData: any = null;
      if (currentRaw) {
        try {
          const currentParsed = JSON.parse(currentRaw);
          const currentState = currentParsed.state ?? currentParsed;
          currentData = currentState.projectData ?? currentState;
        } catch {
          // Corrupt file, will be overwritten
        }
      }

      // If legacy has rich data but per-project doesn't, restore
      if (!isRich(currentData)) {
        const payload = JSON.stringify({
          state: {
            activeProjectId: pid,
            projectData: legacyData,
            ...(state.config ? { config: state.config } : {}),
          },
          version: parsed.version ?? 0,
        });

        await fileStorage.setItem(projectKey, payload);
        recoveredCount++;
        console.log(`[Recovery] Restored ${storeName} for project ${pid.substring(0, 8)} from legacy data`);
      }
    }

    if (recoveredCount > 0) {
      console.log(`[Recovery] ${legacyKey}: recovered ${recoveredCount} projects`);
    }
  } catch (error) {
    console.error(`[Recovery] Failed to recover ${legacyKey}:`, error);
  }
}

// ==================== Helpers ====================

async function writeMigrationFlag(): Promise<void> {
  const flag = JSON.stringify({
    migratedAt: new Date().toISOString(),
    version: 1,
  });
  await fileStorage.setItem(MIGRATION_FLAG_KEY, flag);
  console.log('[Migration] Migration flag written.');
}
