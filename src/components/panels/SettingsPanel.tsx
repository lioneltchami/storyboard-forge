// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * Settings Panel - Unified API Manager v2
 * Provider-based API configuration with multi-key support
 * Based on AionUi's ModelModalContent pattern
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  isVisibleImageHostProvider,
  findImageHostPreset,
  useAPIConfigStore,
  type IProvider,
  type ImageHostProvider,
  type AIFeature,
} from "@/stores/api-config-store";
import { useAppSettingsStore } from "@/stores/app-settings-store";
import { useProjectStore } from "@/stores/project-store";
import { useCharacterLibraryStore } from "@/stores/character-library-store";
import { useSceneStore } from "@/stores/scene-store";
import { useMediaStore } from "@/stores/media-store";
import { getApiKeyCount, parseApiKeys, maskApiKey } from "@/lib/api-key-manager";
import { AddProviderDialog, EditProviderDialog, FeatureBindingPanel } from "@/components/api-manager";
import { AddImageHostDialog } from "@/components/image-host-manager/AddImageHostDialog";
import { EditImageHostDialog } from "@/components/image-host-manager/EditImageHostDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  Settings,
  Key,
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Shield,
  Check,
  X,
  Loader2,
  Zap,
  Info,
  Image,
  RotateCcw,
  Link2,
  Play,
  ShieldAlert,
  Layers,
  Folder,
  HardDrive,
  Download,
  RefreshCw,
  Upload,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { uploadToImageHost } from "@/lib/image-host";
import { getProviderDisplayName } from "@/lib/api-key-manager";
import { UpdateDialog } from "@/components/UpdateDialog";
import type { AvailableUpdateInfo } from "@/types/update";
import packageJson from "../../../package.json";

const APP_NAME = "Storyboard Forge";
const APP_TAGLINE = "AI-powered storyboard and video creation";

function cleanDisplayText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "[object Object]" || trimmed === "undefined") {
    return fallback;
  }
  return trimmed;
}

function getProviderLabel(provider: Pick<IProvider, "name" | "platform">): string {
  return cleanDisplayText(
    getProviderDisplayName(provider.name, provider.platform),
    "Provider",
  );
}

function getProviderPlatformLabel(provider: Pick<IProvider, "name" | "platform">): string {
  return cleanDisplayText(
    getProviderDisplayName(provider.name, provider.platform),
    cleanDisplayText(provider.platform, "Provider"),
  );
}

function getImageHostLabel(provider: Pick<ImageHostProvider, "name" | "platform">): string {
  return cleanDisplayText(
    provider.name,
    cleanDisplayText(findImageHostPreset(provider.platform)?.name, provider.platform),
  );
}

// Platform icon mapping
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  memefast: <Zap className="h-5 w-5" />,
  runninghub: <Image className="h-5 w-5" />,
  custom: <Settings className="h-5 w-5" />,
};

export function SettingsPanel() {
  const {
    providers,
    concurrency,
    advancedOptions,
    imageHostProviders,
    addProvider,
    updateProvider,
    removeProvider,
    addImageHostProvider,
    updateImageHostProvider,
    removeImageHostProvider,
    setConcurrency,
    setAdvancedOption,
    resetAdvancedOptions,
    isImageHostConfigured,
    syncProviderModels,
    setFeatureBindings,
    getFeatureBindings,
  } = useAPIConfigStore();
  const {
    resourceSharing,
    storagePaths,
    cacheSettings,
    updateSettings,
    setResourceSharing,
    setStoragePaths,
    setCacheSettings,
    setUpdateSettings,
  } = useAppSettingsStore();
  const { activeProjectId } = useProjectStore();
  const { assignProjectToUnscoped: assignCharactersToProject } = useCharacterLibraryStore();
  const { assignProjectToUnscoped: assignScenesToProject } = useSceneStore();
  const { assignProjectToUnscoped: assignMediaToProject } = useMediaStore();

  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<IProvider | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
  const [imageHostAddOpen, setImageHostAddOpen] = useState(false);
  const [imageHostEditOpen, setImageHostEditOpen] = useState(false);
  const [editingImageHost, setEditingImageHost] = useState<ImageHostProvider | null>(null);
  const [testingImageHostId, setTestingImageHostId] = useState<string | null>(null);
  const [cacheSize, setCacheSize] = useState(0);
  const [isCacheLoading, setIsCacheLoading] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdateInfo | null>(null);
  const [appVersion, setAppVersion] = useState(packageJson.version);
  const visibleImageHostProviders = useMemo(
    () => imageHostProviders.filter(isVisibleImageHostProvider),
    [imageHostProviders],
  );

  // ====== Memefast 默认绑定自动补全 ======
  // 覆盖场景：
  //  1. 旧版本升级后已有 key 但 featureBindings 为空
  //  2. 旧版本留下无效绑定（模型名错、provider ID 变更等）
  //  3. 用户编辑填 key 后页面刷新
  useEffect(() => {
    const mf = providers.find(p => p.platform === 'memefast');
    if (!mf || parseApiKeys(mf.apiKey).length === 0) return;

    const pid = mf.id;
    const defaults: Record<string, string> = {
      script_analysis: `${pid}:deepseek-v3.2`,
      character_generation: `${pid}:gemini-3-pro-image-preview`,
      video_generation: `${pid}:doubao-seedance-1-5-pro-251215`,
      image_understanding: `${pid}:gemini-2.5-flash`,
    };

    // 检查绑定是否有效
    const isBindingValid = (b: string): boolean => {
      const idx = b.indexOf(':');
      if (idx <= 0) return false;
      const ref = b.slice(0, idx);
      const model = b.slice(idx + 1);
      const p = providers.find(pv => pv.id === ref || pv.platform === ref);
      if (!p || parseApiKeys(p.apiKey).length === 0) return false;
      // 模型列表为空时（尚未同步）暂时信任绑定
      if (p.model.length === 0) return true;
      return p.model.includes(model);
    };

    let changed = false;
    for (const [feature, binding] of Object.entries(defaults)) {
      const cur = getFeatureBindings(feature as AIFeature);

      // 自愈：deepseek-v3 → deepseek-v3.2（在校验之前先迁移）
      if (feature === 'script_analysis' && cur && cur.some(b => b.endsWith(':deepseek-v3'))) {
        const migrated = cur.map(b => {
          if (!b.endsWith(':deepseek-v3')) return b;
          const i = b.indexOf(':');
          return i > 0 ? `${b.slice(0, i)}:deepseek-v3.2` : binding;
        });
        setFeatureBindings(feature as AIFeature, [...new Set(migrated)]);
        changed = true;
        continue;
      }

      // 为空 或 全部无效 → 重新设置默认值
      const needsDefault = !cur || cur.length === 0 || !cur.some(isBindingValid);
      if (needsDefault) {
        setFeatureBindings(feature as AIFeature, [binding]);
        changed = true;
      }
    }
    if (changed) {
      console.log('[SettingsPanel] Auto-applied memefast default bindings');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const version = await window.appUpdater?.getCurrentVersion?.();
        if (!cancelled && version) {
          setAppVersion(version);
        }
      } catch (error) {
        console.warn("[SettingsPanel] Failed to load app version:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Toggle provider expansion
  const toggleExpanded = (id: string) => {
    setExpandedProviders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open edit dialog
  const handleEdit = (provider: IProvider) => {
    setEditingProvider(provider);
    setEditDialogOpen(true);
  };

  // Delete provider
  const handleDelete = (id: string) => {
    removeProvider(id);
    toast.success("Provider deleted");
  };

  const handleEditImageHost = (provider: ImageHostProvider) => {
    setEditingImageHost(provider);
    setImageHostEditOpen(true);
  };

  const handleDeleteImageHost = (id: string) => {
    removeImageHostProvider(id);
    toast.success("Image host deleted");
  };

  const handleTestImageHost = async (provider: ImageHostProvider) => {
    setTestingImageHostId(provider.id);
    try {
      const testImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      const providerLabel = getImageHostLabel(provider);
      const result = await uploadToImageHost(testImage, {
        expiration: 60,
        providerId: provider.id,
      });
      if (result.success) {
        toast.success(`Image host ${providerLabel} connection test succeeded`);
      } else {
        toast.error(`Connection test failed: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      toast.error("Connection test failed. Check your network and try again.");
    } finally {
      setTestingImageHostId(null);
    }
  };

  // Test connection - directly call external APIs
  const testConnection = async (provider: IProvider) => {
    const keys = parseApiKeys(provider.apiKey);
    if (keys.length === 0) {
      toast.error("Please configure an API key first");
      return;
    }

    const providerLabel = getProviderLabel(provider);
    setTestingProvider(provider.id);
    setTestResults((prev) => ({ ...prev, [provider.id]: null }));

    try {
      let response: Response;
      const apiKey = keys[0]; // Use first key for test
      const normalizedBaseUrl = provider.baseUrl?.replace(/\/+$/, "");
      const buildEndpoint = (root: string, path: string) => {
        const normalized = root.replace(/\/+$/, "");
        return /\/v\d+$/.test(normalized) ? `${normalized}/${path}` : `${normalized}/v1/${path}`;
      };

      if (provider.platform === "runninghub") {
        if (!normalizedBaseUrl) {
          toast.error("Please configure the Base URL first");
          setTestingProvider(null);
          return;
        }
        response = await fetch(`${normalizedBaseUrl}/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            taskId: "test-connection-check",
          }),
        });
        
        // For RunningHub, 400/404 means auth is OK (task doesn't exist)
        if (response.status === 400 || response.status === 404) {
          setTestResults((prev) => ({ ...prev, [provider.id]: true }));
          toast.success("Connection test succeeded");
          setTestingProvider(null);
          return;
        }
      } else if (normalizedBaseUrl && provider.model?.length) {
        const endpoint = buildEndpoint(normalizedBaseUrl, "chat/completions");
        const model = provider.model[0];
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 5,
          }),
        });
      } else {
        // For providers without chat endpoint info, just mark as configured
        setTestResults((prev) => ({ ...prev, [provider.id]: true }));
        toast.success(`${providerLabel} is configured`);
        setTestingProvider(null);
        return;
      }

      const success = response.ok;
      setTestResults((prev) => ({ ...prev, [provider.id]: success }));

      if (success) {
        toast.success("Connection test succeeded");
      } else {
        const errorData = await response.text();
        console.error("API test error:", response.status, errorData);
        toast.error(`Connection test failed (${response.status})`);
      }
    } catch (error) {
      console.error("Connection test error:", error);
      setTestResults((prev) => ({ ...prev, [provider.id]: false }));
      toast.error("Connection test failed. Check your network and try again.");
    } finally {
      setTestingProvider(null);
    }
  };

  // Get existing platforms
  const existingPlatforms = useMemo(
    () => providers.map((p) => p.platform),
    [providers]
  );

  const configuredCount = providers.filter(
    (p) => parseApiKeys(p.apiKey).length > 0
  ).length;

  const [activeTab, setActiveTab] = useState<string>("api");
  const hasStorageManager = typeof window !== "undefined" && !!window.storageManager;
  const hasAppUpdater = typeof window !== "undefined" && !!window.appUpdater;

  const formatBytes = useCallback((bytes: number) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(
      units.length - 1,
      Math.floor(Math.log(bytes) / Math.log(1024))
    );
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
  }, []);

  const refreshCacheSize = useCallback(async () => {
    if (!window.storageManager) return;
    setIsCacheLoading(true);
    try {
      const result = await window.storageManager.getCacheSize();
      setCacheSize(result.total || 0);
    } catch (error) {
      console.error("Failed to get cache size:", error);
    } finally {
      setIsCacheLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasStorageManager) return;
    window.storageManager
      ?.getPaths()
      .then((paths) => {
        if (paths.basePath) {
          setStoragePaths({ basePath: paths.basePath });
        }
      })
      .catch(() => {});
    refreshCacheSize();
  }, [hasStorageManager, refreshCacheSize, setStoragePaths]);

  useEffect(() => {
    if (!hasStorageManager || !window.storageManager) return;
    window.storageManager.updateConfig({
      autoCleanEnabled: cacheSettings.autoCleanEnabled,
      autoCleanDays: cacheSettings.autoCleanDays,
    });
  }, [cacheSettings.autoCleanEnabled, cacheSettings.autoCleanDays, hasStorageManager]);

  const handleToggleShareCharacters = async (checked: boolean) => {
    setResourceSharing({ shareCharacters: checked });
    if (!checked && activeProjectId) {
      assignCharactersToProject(activeProjectId);
    }
    // Rehydrate to load/unload other projects' data
    try {
      await useCharacterLibraryStore.persist.rehydrate();
    } catch (error) {
      console.warn("[SettingsPanel] Failed to rehydrate character library:", error);
    }
  };

  const handleToggleShareScenes = async (checked: boolean) => {
    setResourceSharing({ shareScenes: checked });
    if (!checked && activeProjectId) {
      assignScenesToProject(activeProjectId);
    }
    try {
      await useSceneStore.persist.rehydrate();
    } catch (error) {
      console.warn("[SettingsPanel] Failed to rehydrate scene store:", error);
    }
  };

  const handleToggleShareMedia = async (checked: boolean) => {
    setResourceSharing({ shareMedia: checked });
    if (!checked && activeProjectId) {
      assignMediaToProject(activeProjectId);
    }
    try {
      await useMediaStore.persist.rehydrate();
    } catch (error) {
      console.warn("[SettingsPanel] Failed to rehydrate media store:", error);
    }
  };

  // Unified storage handlers
  const handleSelectStoragePath = async () => {
    if (!window.storageManager) {
      toast.error("Use this feature in the desktop app.");
      return;
    }
    const dir = await window.storageManager.selectDirectory();
    if (!dir) return;
    const result = await window.storageManager.moveData(dir);
    if (result.success) {
      setStoragePaths({ basePath: result.path || dir });
      
      // 清除 localStorage 中的缓存，确保从新路径加载数据
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('moyin-') || key.includes('store')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 清除 IndexedDB 缓存
      try {
        const dbRequest = indexedDB.open('moyin-creator-db', 1);
        dbRequest.onsuccess = () => {
          const db = dbRequest.result;
          if (db.objectStoreNames.contains('zustand-storage')) {
            const tx = db.transaction('zustand-storage', 'readwrite');
            tx.objectStore('zustand-storage').clear();
          }
        };
      } catch (e) {
        console.warn('Failed to clear IndexedDB:', e);
      }
      
      toast.success("Storage location updated. Reloading...");
      setTimeout(() => window.location.reload(), 500);
    } else {
      toast.error(`Move failed: ${result.error || "Unknown error"}`);
    }
  };

  const handleExportData = async () => {
    if (!window.storageManager) return;
    const dir = await window.storageManager.selectDirectory();
    if (!dir) return;
    const result = await window.storageManager.exportData(dir);
    if (result.success) {
      toast.success("Data exported");
    } else {
      toast.error(`Export failed: ${result.error || "Unknown error"}`);
    }
  };

  const handleImportData = async () => {
    if (!window.storageManager) return;
    const dir = await window.storageManager.selectDirectory();
    if (!dir) return;
    if (!confirm("Importing will overwrite the current data. Continue?")) return;
    const result = await window.storageManager.importData(dir);
    if (result.success) {
      // 清除 localStorage 中的缓存，防止旧数据覆盖导入的数据
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('moyin-') || key.includes('store')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 清除 IndexedDB 缓存
      try {
        const dbRequest = indexedDB.open('moyin-creator-db', 1);
        dbRequest.onsuccess = () => {
          const db = dbRequest.result;
          if (db.objectStoreNames.contains('zustand-storage')) {
            const tx = db.transaction('zustand-storage', 'readwrite');
            tx.objectStore('zustand-storage').clear();
          }
        };
      } catch (e) {
        console.warn('Failed to clear IndexedDB:', e);
      }
      
      toast.success("Data imported. Reloading...");
      // 延迟刷新页面以确保缓存清理完成
      setTimeout(() => window.location.reload(), 500);
    } else {
      toast.error(`Import failed: ${result.error || "Unknown error"}`);
    }
  };

  const handleLinkData = async () => {
    if (!window.storageManager) {
      toast.error("Use this feature in the desktop app.");
      return;
    }
    const dir = await window.storageManager.selectDirectory();
    if (!dir) return;
    
    // Validate the directory first
    const validation = await window.storageManager.validateDataDir(dir);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid data directory");
      return;
    }
    
    // Confirm with user
    const confirmMsg = `Detected ${validation.projectCount || 0} project file(s) and ${validation.mediaCount || 0} media file(s).\n\nLink to this directory? Restarting the app afterward is recommended.`;
    if (!confirm(confirmMsg)) return;
    
    const result = await window.storageManager.linkData(dir);
    if (result.success) {
      setStoragePaths({ basePath: result.path || dir });
      
      // 清除 localStorage 中的缓存，确保从新路径加载数据
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('moyin-') || key.includes('store')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 清除 IndexedDB 缓存
      try {
        const dbRequest = indexedDB.open('moyin-creator-db', 1);
        dbRequest.onsuccess = () => {
          const db = dbRequest.result;
          if (db.objectStoreNames.contains('zustand-storage')) {
            const tx = db.transaction('zustand-storage', 'readwrite');
            tx.objectStore('zustand-storage').clear();
          }
        };
      } catch (e) {
        console.warn('Failed to clear IndexedDB:', e);
      }
      
      toast.success("Data directory linked. Reloading...");
      setTimeout(() => window.location.reload(), 500);
    } else {
      toast.error(`Operation failed: ${result.error || "Unknown error"}`);
    }
  };

  const handleClearCache = async () => {
    if (!window.storageManager) return;
    setIsClearingCache(true);
    try {
      const result = await window.storageManager.clearCache();
      if (result.success) {
        toast.success("Cache cleared");
        refreshCacheSize();
      } else {
        toast.error(`Clear failed: ${result.error || "Unknown error"}`);
      }
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleCheckForUpdates = async () => {
    if (!window.appUpdater) {
      toast.error("Use this feature in the desktop app.");
      return;
    }

    setIsCheckingForUpdates(true);
    try {
      const result = await window.appUpdater.checkForUpdates();
      if (!result.success) {
        toast.error(`Update check failed: ${result.error || "Unknown error"}`);
        return;
      }

      if (result.hasUpdate && result.update) {
        setAvailableUpdate(result.update);
        setUpdateDialogOpen(true);
        return;
      }

      setAvailableUpdate(null);
      toast.success(`You're already on the latest version: v${result.currentVersion}`);
    } catch (error) {
      console.error("[SettingsPanel] Failed to check updates:", error);
      toast.error("Update check failed. Please try again later.");
    } finally {
      setIsCheckingForUpdates(false);
    }
  };

  const handleClearIgnoredVersion = () => {
    setUpdateSettings({ ignoredVersion: "" });
    toast.success("Update reminder restored");
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-border bg-panel px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-3">
            <Settings className="w-5 h-5 text-primary" />
            Settings
          </h2>
        </div>
        {activeTab === "api" && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono bg-muted border border-border px-2 py-1 rounded">
              Configured: {configuredCount}/{providers.length}
            </span>
            <Button onClick={() => setAddDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add provider
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-6">
          <TabsList className="h-12 bg-transparent p-0 gap-4">
            <TabsTrigger 
              value="api" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12"
            >
              <Key className="h-4 w-4 mr-2" />
              API management
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12"
            >
              <Layers className="h-4 w-4 mr-2" />
              Advanced options
            </TabsTrigger>
            <TabsTrigger 
              value="imagehost" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12"
            >
              <Upload className="h-4 w-4 mr-2" />
              Image host
              {isImageHostConfigured() && (
                <span className="ml-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="storage" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-12"
            >
              <HardDrive className="h-4 w-4 mr-2" />
              Storage
            </TabsTrigger>
          </TabsList>
        </div>

        {/* API Management Tab */}
        <TabsContent value="api" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-8 max-w-5xl mx-auto space-y-8">
          {/* Security Notice */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg">
            <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium text-foreground text-sm">Security note</h3>
              <p className="text-xs text-muted-foreground mt-1">
                API keys are stored locally on this device and are not uploaded to our servers. Multiple keys are supported, with automatic fallback on failure.
              </p>
            </div>
          </div>

          {/* MemeFast purchase guidance */}
          <a
            href="https://memefast.top"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-500/5 to-primary/5 border border-orange-500/20 rounded-lg hover:border-orange-500/40 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground text-sm flex items-center gap-2">
                MemeFast
                <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded">
                  Recommended
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                One gateway for 543+ AI models, including GPT, Claude, Gemini, DeepSeek, Sora, and more.
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-primary group-hover:underline">
              Get API key
              <ExternalLink className="h-3.5 w-3.5" />
            </span>
          </a>

          {/* Feature Binding */}
          <FeatureBindingPanel />

          {/* Provider List */}
          <div className="space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Key className="h-4 w-4" />
              API providers
            </h3>

            {providers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-xl">
                  <Info className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                  No providers configured yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                MemeFast is the recommended option for one-stop access to 543+ models.
                  </p>
                <a
                  href="https://memefast.top"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open MemeFast to get a key
                </a>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add provider
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {providers.map((provider) => {
                  const isExpanded = expandedProviders[provider.id] ?? false;
                  const keyCount = getApiKeyCount(provider.apiKey);
                  const configured = keyCount > 0;
                  const testResult = testResults[provider.id];
                  const isTesting = testingProvider === provider.id;

                  return (
                    <Collapsible
                      key={provider.id}
                      open={isExpanded}
                      onOpenChange={() => toggleExpanded(provider.id)}
                    >
                      <div
                        className={cn(
                          "border rounded-xl transition-all",
                          configured
                            ? "bg-card border-primary/30"
                            : "bg-card border-border"
                        )}
                      >
                        {/* Header */}
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-4 hover:bg-muted/30 rounded-t-xl transition-colors">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "p-2 rounded-lg",
                                  configured
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {PLATFORM_ICONS[provider.platform] || (
                                  <Settings className="h-5 w-5" />
                                )}
                              </div>
                              <div className="text-left">
                                <h4 className="font-medium text-foreground flex items-center gap-2">
                                  {getProviderLabel(provider)}
                                  {provider.platform === 'memefast' && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded font-normal">
                                      Recommended
                                    </span>
                                  )}
                                  {configured && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-normal">
                                      Configured
                                    </span>
                                  )}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {getProviderPlatformLabel(provider)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span
                                  className="cursor-pointer hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpanded(provider.id);
                                  }}
                                >
                                  Models ({provider.model.length})
                                </span>
                                <span>|</span>
                                <span
                                  className="cursor-pointer hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(provider);
                                  }}
                                >
                                  Key ({keyCount})
                                </span>
                              </div>

                              <div
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Sync model list"
                                  onClick={async () => {
                                    setSyncingProvider(provider.id);
                                    const result = await syncProviderModels(provider.id);
                                    setSyncingProvider(null);
                                    if (result.success) {
                                      toast.success(`Synced ${result.count} model(s)`);
                                    } else {
                                      toast.error(result.error || "Sync failed");
                                    }
                                  }}
                                  disabled={!configured || syncingProvider === provider.id}
                                >
                                  {syncingProvider === provider.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Test connection"
                                  onClick={() => testConnection(provider)}
                                  disabled={!configured || isTesting}
                                >
                                  {isTesting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : testResult === true ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : testResult === false ? (
                                    <X className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <Shield className="h-4 w-4" />
                                  )}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Edit"
                                  onClick={() => handleEdit(provider)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Confirm deletion
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Delete {getProviderLabel(provider)}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(provider.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>

                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        {/* MemeFast purchase guidance */}
                        {provider.platform === 'memefast' && !configured && (
                          <div className="px-4 pb-2">
                            <a
                              href="https://memefast.top"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open MemeFast to get a key -&gt;
                            </a>
                          </div>
                        )}

                        {/* Expandable Content */}
                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                            {/* Base URL */}
                            {provider.baseUrl && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">
                                  Base URL:{" "}
                                </span>
                                <span className="font-mono text-foreground">
                                  {provider.baseUrl}
                                </span>
                              </div>
                            )}

                            {/* Models */}
                            {provider.model.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {provider.model.map((m) => (
                                  <span
                                    key={m}
                                    className="text-xs px-2 py-1 bg-muted rounded font-mono"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* API Key Preview */}
                            {configured && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">
                                  API Key:{" "}
                                </span>
                                <span className="font-mono text-foreground">
                                  {maskApiKey(parseApiKeys(provider.apiKey)[0])}
                                  {keyCount > 1 && (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      (+{keyCount - 1} more)
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>

          {/* Global Settings */}
          <div className="p-6 border border-border rounded-xl bg-card space-y-6">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Global settings
            </h3>

            {/* Concurrency */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Concurrent jobs</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  value={concurrency}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1) setConcurrency(val);
                  }}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">
                  Number of generation jobs to run at the same time. With multiple keys you can raise this, but staying at or below the key count is recommended.
                </span>
              </div>
            </div>
          </div>

              {/* About */}
              <div className="text-center py-8 text-muted-foreground border-t border-border">
                <p className="text-sm font-medium">{APP_NAME}</p>
                <p className="text-xs mt-1">v{appVersion} · {APP_TAGLINE}</p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Advanced Options Tab */}
        <TabsContent value="advanced" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-8 max-w-3xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Advanced generation options
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    These options affect video generation behavior in the AI Director workflow.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    resetAdvancedOptions();
                    toast.success("Default settings restored");
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset defaults
                </Button>
              </div>

              {/* Options List */}
              <div className="space-y-4">
                {/* Visual Continuity */}
                <div className="p-4 border border-border rounded-xl bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <Link2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Visual continuity</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Automatically passes the last frame of one shot into the next shot as a reference image to preserve style and character consistency.
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Recommended on · best for continuous storytelling and longer videos
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={advancedOptions.enableVisualContinuity}
                      onCheckedChange={(checked) => setAdvancedOption('enableVisualContinuity', checked)}
                    />
                  </div>
                </div>

                {/* Resume Generation */}
                <div className="p-4 border border-border rounded-xl bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <Play className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Resume interrupted runs</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Resume from the last completed position after a batch run is interrupted instead of starting over.
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Recommended on · helps prevent progress loss after network drops or API timeouts
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={advancedOptions.enableResumeGeneration}
                      onCheckedChange={(checked) => setAdvancedOption('enableResumeGeneration', checked)}
                    />
                  </div>
                </div>

                {/* Content Moderation */}
                <div className="p-4 border border-border rounded-xl bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Moderation fault tolerance</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Automatically skips blocked shots with sensitive content and continues generating the rest.
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Recommended on · keeps one failed shot from stopping the whole batch
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={advancedOptions.enableContentModeration}
                      onCheckedChange={(checked) => setAdvancedOption('enableContentModeration', checked)}
                    />
                  </div>
                </div>

                {/* Auto Model Switch */}
                <div className="p-4 border border-border rounded-xl bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground mt-0.5">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Automatic multi-model switching</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Uses text-to-video for the first shot and image-to-video for the remaining shots.
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Off by default · requires multiple configured models
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={advancedOptions.enableAutoModelSwitch}
                      onCheckedChange={(checked) => setAdvancedOption('enableAutoModelSwitch', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Info Notice */}
              <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    These options change how the AI Director generates video. If you are unsure what one does, the default settings are the safest choice.
                  </p>
                </div>
              </div>

              {/* About */}
              <div className="text-center py-8 text-muted-foreground border-t border-border">
                <p className="text-sm font-medium">{APP_NAME}</p>
                <p className="text-xs mt-1">v{appVersion} · {APP_TAGLINE}</p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Image Host Config Tab */}
        <TabsContent value="imagehost" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-8 max-w-3xl mx-auto space-y-8">
              {/* Header */}
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Image host configuration
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Image hosts store temporary images used during video generation, such as tail-frame extraction and frame handoff.
                </p>
              </div>

              {/* Image Host Providers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Image host providers</Label>
                  <Button size="sm" variant="outline" onClick={() => setImageHostAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>

                {visibleImageHostProviders.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No image hosts configured yet</div>
                ) : (
                  <div className="space-y-3">
                    {visibleImageHostProviders.map((provider) => {
                      const keyCount = getApiKeyCount(provider.apiKey);
                      const endpoint = provider.uploadPath || provider.baseUrl;
                      const configured = provider.enabled && !!endpoint && (provider.apiKeyOptional || keyCount > 0);
                      return (
                        <div key={provider.id} className="p-4 border border-border rounded-xl bg-card space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{getImageHostLabel(provider)}</span>
                                {configured ? (
                                  <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded">
                                    Configured
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                                    Not configured
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {getImageHostLabel(provider)} · {cleanDisplayText(endpoint, "No endpoint set")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {provider.apiKeyOptional && keyCount === 0
                                  ? "Guest uploads enabled (no key required)"
                                  : `${keyCount} key(s)`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={provider.enabled}
                                onCheckedChange={(checked) =>
                                  updateImageHostProvider({ ...provider, enabled: checked })
                                }
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!provider.enabled || testingImageHostId === provider.id}
                              onClick={() => handleTestImageHost(provider)}
                            >
                              {testingImageHostId === provider.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Test connection"
                              )}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditImageHost(provider)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteImageHost(provider.id)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Info Notice */}
              <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Image hosts store temporary images for video generation, especially for visual continuity.
                    Without one, cross-shot frame handoff will be limited.
                    If multiple image hosts are enabled, they are used in sequence with automatic fallback on failure.
                  </p>
                  <p className="text-sm">
                    SCDN is enabled by default and does not require a key.
                    ImgBB stays off by default; if you want to use it, enable it manually and verify it yourself.
                  </p>
                </div>
              </div>

              {/* About */}
              <div className="text-center py-8 text-muted-foreground border-t border-border">
                <p className="text-sm font-medium">{APP_NAME}</p>
                <p className="text-xs mt-1">v{appVersion} · {APP_TAGLINE}</p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-8 max-w-3xl mx-auto space-y-8">
              {/* Header */}
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Storage settings
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage resource sharing, storage locations, and cache behavior.
                </p>
              </div>

              {!hasStorageManager && (
                <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg">
                  <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Storage settings are only available in the desktop build.
                    </p>
                  </div>
                </div>
              )}

              {/* Resource Sharing */}
              <div className="p-6 border border-border rounded-xl bg-card space-y-4">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Resource sharing
                </h4>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Share character library across projects</p>
                    <p className="text-xs text-muted-foreground">If disabled, only the current project can see these assets.</p>
                  </div>
                  <Switch
                    checked={resourceSharing.shareCharacters}
                    onCheckedChange={handleToggleShareCharacters}
                    disabled={!hasStorageManager}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Share scene library across projects</p>
                    <p className="text-xs text-muted-foreground">If disabled, only the current project can see these assets.</p>
                  </div>
                  <Switch
                    checked={resourceSharing.shareScenes}
                    onCheckedChange={handleToggleShareScenes}
                    disabled={!hasStorageManager}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Share media library across projects</p>
                    <p className="text-xs text-muted-foreground">If disabled, only the current project can see these assets.</p>
                  </div>
                  <Switch
                    checked={resourceSharing.shareMedia}
                    onCheckedChange={handleToggleShareMedia}
                    disabled={!hasStorageManager}
                  />
                </div>
              </div>

              {/* Storage Path - Single unified location */}
              <div className="p-6 border border-border rounded-xl bg-card space-y-5">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Storage location
                </h4>

                <div className="space-y-3">
                  <Label className="text-xs text-muted-foreground">Data location for projects and media</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={storagePaths.basePath || "Default location"}
                      placeholder="Default location"
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button size="sm" onClick={handleSelectStoragePath} disabled={!hasStorageManager}>
                      Choose
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportData} disabled={!hasStorageManager}>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleImportData} disabled={!hasStorageManager}>
                      Import
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Changing the location moves existing data into the new directory and creates `projects/` and `media/` automatically.
                </p>
              </div>

              {/* Data Recovery - Link to existing data */}
              <div className="p-6 border border-border rounded-xl bg-card space-y-4">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Data recovery
                </h4>
                <p className="text-sm text-muted-foreground">
                  After moving to a new machine or reinstalling the system, link an existing data directory to recover your projects and configuration.
                </p>

                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLinkData} 
                    disabled={!hasStorageManager}
                    className="w-full"
                  >
                    <Folder className="h-3.5 w-3.5 mr-1" />
                    Link existing data directory
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Choose a directory that already contains `projects/` and `media/`. Restarting afterward is recommended.
                  </p>
                </div>
              </div>

              {/* Cache Management */}
              <div className="p-6 border border-border rounded-xl bg-card space-y-4">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Cache management
                </h4>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Cache size</p>
                    <p className="text-xs text-muted-foreground">
                      {isCacheLoading ? "Calculating..." : formatBytes(cacheSize)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={refreshCacheSize}
                      disabled={!hasStorageManager || isCacheLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${isCacheLoading ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearCache}
                      disabled={!hasStorageManager || isClearingCache}
                    >
                      {isClearingCache ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Clear"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Automatic cleanup</p>
                    <p className="text-xs text-muted-foreground">Off by default</p>
                  </div>
                  <Switch
                    checked={cacheSettings.autoCleanEnabled}
                    onCheckedChange={(checked) => setCacheSettings({ autoCleanEnabled: checked })}
                    disabled={!hasStorageManager}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Remove files older than</Label>
                  <Input
                    type="number"
                    min={1}
                    value={cacheSettings.autoCleanDays}
                    onChange={(e) =>
                      setCacheSettings({ autoCleanDays: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="w-20"
                    disabled={!cacheSettings.autoCleanEnabled}
                  />
                  <span className="text-xs text-muted-foreground">day(s)</span>
                </div>
              </div>

              <div className="p-6 border border-border rounded-xl bg-card space-y-5">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  App updates
                </h4>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Current version</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">v{appVersion}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCheckForUpdates}
                    disabled={!hasAppUpdater || isCheckingForUpdates}
                  >
                    {isCheckingForUpdates ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Check for updates
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Check for updates on startup</p>
                    <p className="text-xs text-muted-foreground">
                      When enabled, the desktop app checks the remote release manifest on startup and prompts when a new version is available.
                    </p>
                  </div>
                  <Switch
                    checked={updateSettings.autoCheckEnabled}
                    onCheckedChange={(checked) => setUpdateSettings({ autoCheckEnabled: checked })}
                    disabled={!hasAppUpdater}
                  />
                </div>

                {updateSettings.ignoredVersion && (
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Ignored version</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        v{updateSettings.ignoredVersion}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClearIgnoredVersion}>
                      Restore reminder
                    </Button>
                  </div>
                )}

                {!hasAppUpdater && (
                  <p className="text-xs text-muted-foreground">
                    This feature is only available in packaged desktop builds.
                  </p>
                )}
              </div>

              {/* About */}
              <div className="text-center py-8 text-muted-foreground border-t border-border">
                <p className="text-sm font-medium">{APP_NAME}</p>
                <p className="text-xs mt-1">v{appVersion} · {APP_TAGLINE}</p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddProviderDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(providerData) => {
          // 魔因API：已存在时合并 Key，不重复创建
          const existingMemefast = providerData.platform === 'memefast'
            ? providers.find((p) => p.platform === 'memefast')
            : null;
          let provider: IProvider;
          if (existingMemefast) {
            const oldKeys = parseApiKeys(existingMemefast.apiKey);
            const newKeys = parseApiKeys(providerData.apiKey);
            const merged = Array.from(new Set([...oldKeys, ...newKeys]));
            updateProvider({ ...existingMemefast, apiKey: merged.join(',') });
            provider = existingMemefast;
          } else {
            provider = addProvider(providerData);
          }
          // 如果添加的是 memefast 供应商，自动设置默认服务映射（仅在对应服务尚未配置时）
          if (providerData.platform === 'memefast') {
            // 使用 provider.id（而非 platform 字符串）避免多供应商时的歧义解析
            const pid = provider.id;
            const MEMEFAST_DEFAULT_BINDINGS: Record<string, string> = {
              // NOTE: MemeFast 端点已升级，旧的 deepseek-v3 已不在列表中，改用 deepseek-v3.2
              script_analysis: `${pid}:deepseek-v3.2`,
              character_generation: `${pid}:gemini-3-pro-image-preview`,
              video_generation: `${pid}:doubao-seedance-1-5-pro-251215`,
              image_understanding: `${pid}:gemini-2.5-flash`,
            };
            for (const [feature, binding] of Object.entries(MEMEFAST_DEFAULT_BINDINGS)) {
              const current = getFeatureBindings(feature as AIFeature);
              // 仅在未配置时设置默认值，避免覆盖用户手动选择
              if (!current || current.length === 0) {
                setFeatureBindings(feature as AIFeature, [binding]);
                continue;
              }
              // 自愈：旧默认 deepseek-v3 -> deepseek-v3.2（尽量不破坏多选配置）
              if (feature === 'script_analysis') {
                const hasOld = current.some((b) => b.endsWith(':deepseek-v3'));
                if (hasOld) {
                  const migrated = current.map((b) => {
                    if (!b.endsWith(':deepseek-v3')) return b;
                    const idx = b.indexOf(':');
                    if (idx <= 0) return binding;
                    const prefix = b.slice(0, idx);
                    return `${prefix}:deepseek-v3.2`;
                  });
                  const deduped = Array.from(new Set(migrated));
                  setFeatureBindings(feature as AIFeature, deduped);
                }
              }
            }
          }
          // 添加后自动同步模型列表和端点元数据
          const finalProviderId = existingMemefast ? existingMemefast.id : provider.id;
          if (parseApiKeys(providerData.apiKey).length > 0) {
            setSyncingProvider(finalProviderId);
            syncProviderModels(finalProviderId).then(result => {
              setSyncingProvider(null);
              if (result.success) {
                toast.success(`Auto-synced ${result.count} model(s)`);
              } else if (result.error) {
                toast.error(`Model sync failed: ${result.error}`);
              }
            });
          }
        }}
        existingPlatforms={existingPlatforms}
      />

      <EditProviderDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        provider={editingProvider}
        onSave={(provider) => {
          updateProvider(provider);

          // 编辑 memefast 时也自动设置默认服务映射：初始状态会预置一个空 key 的 memefast，
          // 用户通常是“编辑填 key”，如果不在这里补默认映射，会导致服务映射一直是 0/6。
          if (provider.platform === 'memefast' && parseApiKeys(provider.apiKey).length > 0) {
            const pid = provider.id;
            const MEMEFAST_DEFAULT_BINDINGS: Record<string, string> = {
              // NOTE: MemeFast 端点已升级，旧的 deepseek-v3 已不在列表中，改用 deepseek-v3.2
              script_analysis: `${pid}:deepseek-v3.2`,
              character_generation: `${pid}:gemini-3-pro-image-preview`,
              video_generation: `${pid}:doubao-seedance-1-5-pro-251215`,
              image_understanding: `${pid}:gemini-2.5-flash`,
            };
            for (const [feature, binding] of Object.entries(MEMEFAST_DEFAULT_BINDINGS)) {
              const current = getFeatureBindings(feature as AIFeature);
              if (!current || current.length === 0) {
                setFeatureBindings(feature as AIFeature, [binding]);
                continue;
              }
              // 自愈：旧默认 deepseek-v3 -> deepseek-v3.2
              if (feature === 'script_analysis') {
                const hasOld = current.some((b) => b.endsWith(':deepseek-v3'));
                if (hasOld) {
                  const migrated = current.map((b) => {
                    if (!b.endsWith(':deepseek-v3')) return b;
                    const idx = b.indexOf(':');
                    if (idx <= 0) return binding;
                    const prefix = b.slice(0, idx);
                    return `${prefix}:deepseek-v3.2`;
                  });
                  const deduped = Array.from(new Set(migrated));
                  setFeatureBindings(feature as AIFeature, deduped);
                }
              }
            }
          }
          // 编辑保存后自动同步模型列表和端点元数据
          if (parseApiKeys(provider.apiKey).length > 0) {
            setSyncingProvider(provider.id);
            syncProviderModels(provider.id).then(result => {
              setSyncingProvider(null);
              if (result.success) {
                toast.success(`Auto-synced ${result.count} model(s)`);
              } else if (result.error) {
                toast.error(`Model sync failed: ${result.error}`);
              }
            });
          }
        }}
      />

      <AddImageHostDialog
        open={imageHostAddOpen}
        onOpenChange={setImageHostAddOpen}
        onSubmit={addImageHostProvider}
      />

      <EditImageHostDialog
        open={imageHostEditOpen}
        onOpenChange={setImageHostEditOpen}
        provider={editingImageHost}
        onSave={updateImageHostProvider}
      />
      <UpdateDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        updateInfo={availableUpdate}
        onIgnoreVersion={(version) => {
          setUpdateSettings({ ignoredVersion: version });
          setAvailableUpdate(null);
        }}
      />
    </div>
  );
}
