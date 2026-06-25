export type Locale = "en" | "zh";

type Primitive = string | number | boolean | null | undefined;

type MessageTree = {
  common: {
    initializing: string;
    loading: string;
    saved: string;
    saving: string;
    unsaved: string;
    later: string;
    cancel: string;
    confirm: string;
    yes: string;
    no: string;
    close: string;
    open: string;
    delete: string;
    rename: string;
    duplicate: string;
    create: string;
    manage: string;
    selectAll: string;
    deselectAll: string;
    help: string;
    settings: string;
    dashboard: string;
    projectList: string;
    backToProjectList: string;
    backToSeriesView: string;
    untitledProject: string;
  };
  shell: {
    appName: string;
    appSubtitle: string;
    themeLight: string;
    themeDark: string;
    switchToLight: string;
    switchToDark: string;
    projectDashboard: string;
    systemSettings: string;
    useHelp: string;
    projectOverview: string;
    phaseLabel: (vars: { phase: string }) => string;
    episodeLabel: (vars: { episode: number }) => string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    newProject: string;
    projectNamePlaceholder: string;
    createNewProject: string;
    noProjectsTitle: string;
    noProjectsSubtitle: string;
    openProject: string;
    editTitle: string;
    renameProject: string;
    confirmDeleteTitle: string;
    confirmDeleteBody: (vars: { count: number }) => string;
    deleteSelected: (vars: { count: number }) => string;
    selectedCount: (vars: { count: number }) => string;
    projectCount: (vars: { count: number }) => string;
    deleteProject: (vars: { name: string }) => string;
    duplicateProject: string;
    rename: string;
  };
  update: {
    newVersion: (vars: { version: string }) => string;
    currentToLatest: (vars: { current: string; latest: string }) => string;
    releaseNotes: string;
    publishedAt: string;
    downloadMethod: string;
    downloadHint: string;
    codeLabel: string;
    noDownloadLink: string;
    githubDownload: string;
    baiduDownload: string;
    ignoreVersion: string;
    later: string;
    desktopOnly: string;
    openDownloadFailed: string;
    noReleaseNotes: string;
  };
  projectHeader: {
    returnToSeries: string;
    episode: (vars: { index: number }) => string;
  };
  settings: {
    apiConfiguration: string;
    storage: string;
    cache: string;
    update: string;
    resourceSharing: string;
    imageHost: string;
    language: string;
    localeEnglish: string;
    localeChinese: string;
    testConnection: string;
    connectionTestSuccess: string;
    connectionTestFailed: string;
    configured: (vars: { name: string }) => string;
    pleaseConfigureKey: string;
    pleaseConfigureBaseUrl: string;
    pleaseUseDesktopApp: string;
    updateStoragePath: string;
    exportData: string;
    importData: string;
    moveFailed: string;
    exportFailed: string;
    importWillOverwrite: string;
    storageUpdatedReloading: string;
    dataExported: string;
    storageLocation: string;
    autoCleanCache: string;
    clearCache: string;
    clearCacheFailed: string;
    cacheSize: string;
    projectSharing: string;
  };
  overview: {
    title: string;
    quickStart: string;
    followOrder: string;
    storyCore: string;
    worldBuilding: string;
    productionSettings: string;
    episodeCatalog: (vars: { count: number }) => string;
    titleLabel: string;
    logline: string;
    outline: string;
    centralConflict: string;
    themes: string;
    era: string;
    genre: string;
    timeline: string;
    socialSystem: string;
    powerSystem: string;
    worldNotes: string;
    visualStyle: string;
    colorPalette: string;
    language: string;
    noneSet: string;
    noEpisodeData: string;
    newEpisode: string;
    episodeTitlePlaceholder: (vars: { index: number }) => string;
    sceneCount: (vars: { count: number }) => string;
    deleteConfirm: string;
    sectionStepLabel: string;
  };
  rightPanel: {
    properties: string;
    pending: string;
  };
};

export const messages: Record<Locale, MessageTree> = {
  en: {
    common: {
      initializing: "Initializing...",
      loading: "Loading...",
      saved: "Saved",
      saving: "Saving...",
      unsaved: "Unsaved",
      later: "Later",
      cancel: "Cancel",
      confirm: "Confirm",
      yes: "Yes",
      no: "No",
      close: "Close",
      open: "Open",
      delete: "Delete",
      rename: "Rename",
      duplicate: "Duplicate",
      create: "Create",
      manage: "Manage",
      selectAll: "Select all",
      deselectAll: "Deselect all",
      help: "Help",
      settings: "Settings",
      dashboard: "Dashboard",
      projectList: "Project list",
      backToProjectList: "Back to project list",
      backToSeriesView: "Back to series view",
      untitledProject: "Untitled project",
    },
    shell: {
      appName: "Moyin Creator",
      appSubtitle: "Moyin Creator Studio",
      themeLight: "Light",
      themeDark: "Dark",
      switchToLight: "Switch to light mode",
      switchToDark: "Switch to dark mode",
      projectDashboard: "Project dashboard",
      systemSettings: "System settings",
      useHelp: "Usage help",
      projectOverview: "Project overview",
      phaseLabel: ({ phase }) => `Phase ${phase}`,
      episodeLabel: ({ episode }) => `Episode ${episode}`,
    },
    dashboard: {
      title: "Moyin Creator",
      subtitle: "Moyin Creator Studio",
      newProject: "New project",
      projectNamePlaceholder: "Enter project name...",
      createNewProject: "Create",
      noProjectsTitle: "No projects yet",
      noProjectsSubtitle: "Create your first AI video project",
      openProject: "Open project",
      editTitle: "Rename title",
      renameProject: "Rename project",
      confirmDeleteTitle: "Confirm batch delete",
      confirmDeleteBody: ({ count }) => `You are about to delete ${count} projects. This action cannot be undone. Continue?`,
      deleteSelected: ({ count }) => `Delete selected (${count})`,
      selectedCount: ({ count }) => `Selected ${count}`,
      projectCount: ({ count }) => `${count} projects`,
      deleteProject: ({ name }) => `Delete "${name}"`,
      duplicateProject: "Duplicate project",
      rename: "Rename",
    },
    update: {
      newVersion: ({ version }) => `New version found v${version}`,
      currentToLatest: ({ current, latest }) => `Current v${current}, upgrade available to v${latest}.`,
      releaseNotes: "Release notes",
      publishedAt: "Published at",
      downloadMethod: "Download method",
      downloadHint: "Choose GitHub or Baidu Netdisk to download the latest installer.",
      codeLabel: "Code:",
      noDownloadLink: "The current manifest does not provide download links.",
      githubDownload: "GitHub download",
      baiduDownload: "Baidu Netdisk download",
      ignoreVersion: "Ignore this version",
      later: "Later",
      desktopOnly: "Use this feature in the desktop app.",
      openDownloadFailed: "Failed to open download link",
      noReleaseNotes: "No release notes were provided for this release.",
    },
    projectHeader: {
      returnToSeries: "Back to series view",
      episode: ({ index }) => `Episode ${index}`,
    },
    settings: {
      apiConfiguration: "API configuration",
      storage: "Storage",
      cache: "Cache",
      update: "Update",
      resourceSharing: "Resource sharing",
      imageHost: "Image host",
      language: "Language",
      localeEnglish: "English",
      localeChinese: "Chinese",
      testConnection: "Test connection",
      connectionTestSuccess: "Connection test succeeded",
      connectionTestFailed: "Connection test failed",
      configured: ({ name }) => `${name} is configured`,
      pleaseConfigureKey: "Please configure an API key first",
      pleaseConfigureBaseUrl: "Please configure the Base URL first",
      pleaseUseDesktopApp: "Use this feature in the desktop app.",
      updateStoragePath: "Storage location updated, reloading...",
      exportData: "Export data",
      importData: "Import data",
      moveFailed: "Move failed",
      exportFailed: "Export failed",
      importWillOverwrite: "Import will overwrite the current data. Continue?",
      storageUpdatedReloading: "Storage location updated, reloading...",
      dataExported: "Data exported",
      storageLocation: "Storage location",
      autoCleanCache: "Auto-clean cache",
      clearCache: "Clear cache",
      clearCacheFailed: "Failed to clear cache",
      cacheSize: "Cache size",
      projectSharing: "Project sharing",
    },
    overview: {
      title: "Project overview",
      quickStart: "Quick start",
      followOrder: "Follow the steps in order. Do not skip ahead.",
      storyCore: "Story core",
      worldBuilding: "World building",
      productionSettings: "Production settings",
      episodeCatalog: ({ count }) => `Episode catalog (${count} episodes)`,
      titleLabel: "Title",
      logline: "Logline",
      outline: "Outline",
      centralConflict: "Central conflict",
      themes: "Themes",
      era: "Era",
      genre: "Genre",
      timeline: "Timeline",
      socialSystem: "Social system",
      powerSystem: "Power system",
      worldNotes: "World notes",
      visualStyle: "Visual style",
      colorPalette: "Color palette",
      language: "Language",
      noneSet: "Not set",
      noEpisodeData: "No episode data yet",
      newEpisode: "New episode",
      episodeTitlePlaceholder: ({ index }) => `Episode ${index} title...`,
      sceneCount: ({ count }) => `${count} scenes`,
      deleteConfirm: "Confirm delete?",
      sectionStepLabel: "Step",
    },
    rightPanel: {
      properties: "Properties",
      pending: "Pending",
    },
  },
  zh: {
    common: {
      initializing: "正在初始化...",
      loading: "加载中...",
      saved: "已保存",
      saving: "正在保存...",
      unsaved: "未保存",
      later: "稍后",
      cancel: "取消",
      confirm: "确定",
      yes: "是",
      no: "否",
      close: "关闭",
      open: "打开",
      delete: "删除",
      rename: "重命名",
      duplicate: "复制",
      create: "创建",
      manage: "管理",
      selectAll: "全选",
      deselectAll: "取消全选",
      help: "帮助",
      settings: "设置",
      dashboard: "项目",
      projectList: "项目列表",
      backToProjectList: "返回项目列表",
      backToSeriesView: "返回全剧视图",
      untitledProject: "未命名项目",
    },
    shell: {
      appName: "魔因漫创",
      appSubtitle: "Moyin Creator Studio",
      themeLight: "浅色",
      themeDark: "深色",
      switchToLight: "切换到浅色模式",
      switchToDark: "切换到深色模式",
      projectDashboard: "项目仪表盘",
      systemSettings: "系统设置",
      useHelp: "使用帮助",
      projectOverview: "项目概览",
      phaseLabel: ({ phase }) => `Phase ${phase}`,
      episodeLabel: ({ episode }) => `第${episode}集`,
    },
    dashboard: {
      title: "魔因漫创",
      subtitle: "Moyin Creator Studio",
      newProject: "新建项目",
      projectNamePlaceholder: "输入项目名称...",
      createNewProject: "创建",
      noProjectsTitle: "还没有项目",
      noProjectsSubtitle: "创建你的第一个 AI 视频项目",
      openProject: "打开项目",
      editTitle: "重命名标题",
      renameProject: "重命名项目",
      confirmDeleteTitle: "确认批量删除",
      confirmDeleteBody: ({ count }) => `即将删除 ${count} 个项目，此操作不可撤销。确定继续？`,
      deleteSelected: ({ count }) => `删除选中 (${count})`,
      selectedCount: ({ count }) => `已选 ${count}`,
      projectCount: ({ count }) => `共 ${count} 个项目`,
      deleteProject: ({ name }) => `删除「${name}」`,
      duplicateProject: "复制项目",
      rename: "重命名",
    },
    update: {
      newVersion: ({ version }) => `发现新版本 v${version}`,
      currentToLatest: ({ current, latest }) => `当前版本 v${current}，可升级到 v${latest}。`,
      releaseNotes: "更新说明",
      publishedAt: "发布时间",
      downloadMethod: "下载方式",
      downloadHint: "可任选 GitHub 或百度网盘下载最新安装包。",
      codeLabel: "提取码：",
      noDownloadLink: "当前版本清单未提供下载链接。",
      githubDownload: "GitHub 下载",
      baiduDownload: "百度网盘下载",
      ignoreVersion: "忽略此版本",
      later: "稍后",
      desktopOnly: "请在桌面版中使用此功能",
      openDownloadFailed: "打开下载链接失败",
      noReleaseNotes: "本次发布未填写更新说明。",
    },
    projectHeader: {
      returnToSeries: "返回全剧视图",
      episode: ({ index }) => `第${index}集`,
    },
    settings: {
      apiConfiguration: "API 配置",
      storage: "存储",
      cache: "缓存",
      update: "更新",
      resourceSharing: "资源共享",
      imageHost: "图床",
      language: "语言",
      localeEnglish: "English",
      localeChinese: "中文",
      testConnection: "连接测试",
      connectionTestSuccess: "连接测试成功",
      connectionTestFailed: "连接测试失败",
      configured: ({ name }) => `${name} 已配置`,
      pleaseConfigureKey: "请先配置 API Key",
      pleaseConfigureBaseUrl: "请先配置 Base URL",
      pleaseUseDesktopApp: "请在桌面应用中使用此功能",
      updateStoragePath: "存储位置已更新，正在刷新...",
      exportData: "导出数据",
      importData: "导入数据",
      moveFailed: "移动失败",
      exportFailed: "导出失败",
      importWillOverwrite: "导入将覆盖当前数据，是否继续？",
      storageUpdatedReloading: "存储位置已更新，正在刷新...",
      dataExported: "数据已导出",
      storageLocation: "存储位置",
      autoCleanCache: "自动清理缓存",
      clearCache: "清空缓存",
      clearCacheFailed: "清空缓存失败",
      cacheSize: "缓存大小",
      projectSharing: "项目共享",
    },
    overview: {
      title: "项目概览",
      quickStart: "新手引导",
      followOrder: "按顺序执行，不要跳步。",
      storyCore: "故事核心",
      worldBuilding: "世界观",
      productionSettings: "制作设定",
      episodeCatalog: ({ count }) => `分集目录 (${count} 集)`,
      titleLabel: "标题",
      logline: "Logline",
      outline: "大纲",
      centralConflict: "核心冲突",
      themes: "主题",
      era: "时代",
      genre: "类型",
      timeline: "时间线",
      socialSystem: "社会体系",
      powerSystem: "力量体系",
      worldNotes: "世界观",
      visualStyle: "视觉风格",
      colorPalette: "色彩基调",
      language: "语言",
      noneSet: "未设置",
      noEpisodeData: "暂无分集数据",
      newEpisode: "新建集",
      episodeTitlePlaceholder: ({ index }) => `第${index}集 标题...`,
      sceneCount: ({ count }) => `${count} 场景`,
      deleteConfirm: "确认删除?",
      sectionStepLabel: "步骤",
    },
    rightPanel: {
      properties: "属性",
      pending: "待定",
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getLocaleLabel(locale: Locale): string {
  return locale === "en" ? "English" : "中文";
}

export function t(locale: Locale, path: string, vars: Record<string, Primitive> = {}): string {
  const parts = path.split(".");
  let value: unknown = messages[locale];
  for (const part of parts) {
    if (!isRecord(value)) return path;
    value = value[part];
  }
  if (typeof value === "function") {
    return (value as (arg: Record<string, Primitive>) => string)(vars);
  }
  if (typeof value === "string") {
    return value.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
  }
  return path;
}

export function formatDateTime(value: string | number | Date, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatRelativeTime(timestamp: number, locale: Locale): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return locale === "en" ? "just now" : "刚刚";
  if (diff < 3600000) return locale === "en" ? `${Math.floor(diff / 60000)} min ago` : `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return locale === "en" ? `${Math.floor(diff / 3600000)} h ago` : `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return locale === "en" ? `${Math.floor(diff / 86400000)} d ago` : `${Math.floor(diff / 86400000)} 天前`;
  return formatDateTime(timestamp, locale);
}
