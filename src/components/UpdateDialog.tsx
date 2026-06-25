// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

import { useMemo } from "react";
import { ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { AvailableUpdateInfo } from "@/types/update";
import { formatDateTime, t } from "@/lib/i18n";
import { useAppSettingsStore } from "@/stores/app-settings-store";

interface UpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateInfo: AvailableUpdateInfo | null;
  onIgnoreVersion?: (version: string) => void;
}

export function UpdateDialog({
  open,
  onOpenChange,
  updateInfo,
  onIgnoreVersion,
}: UpdateDialogProps) {
  const { locale } = useAppSettingsStore();
  const formattedPublishedAt = useMemo(() => {
    if (!updateInfo?.publishedAt) return "";
    const publishedDate = new Date(updateInfo.publishedAt);
    if (Number.isNaN(publishedDate.getTime())) {
      return updateInfo.publishedAt;
    }
    return formatDateTime(publishedDate, locale);
  }, [locale, updateInfo?.publishedAt]);

  const handleOpenLink = async (url: string) => {
    if (!window.appUpdater) {
      toast.error(t(locale, "update.desktopOnly"));
      return;
    }
    const result = await window.appUpdater.openExternalLink(url);
    if (!result.success) {
      toast.error(result.error || t(locale, "update.openDownloadFailed"));
      return;
    }
    onOpenChange(false);
  };

  if (!updateInfo) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{t(locale, "update.newVersion", { version: updateInfo.latestVersion })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(locale, "update.currentToLatest", { current: updateInfo.currentVersion, latest: updateInfo.latestVersion })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{t(locale, "update.releaseNotes")}</p>
                {formattedPublishedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(locale, "update.publishedAt")} {formattedPublishedAt}
                  </p>
                )}
              </div>
              <div className="text-xs text-muted-foreground rounded border border-border px-2 py-1 font-mono">
                v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
              </div>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-6">
              {updateInfo.releaseNotes?.trim() || t(locale, "update.noReleaseNotes")}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{t(locale, "update.downloadMethod")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(locale, "update.downloadHint")}
                </p>
              </div>
              {updateInfo.baiduCode && (
                <div className="text-xs text-muted-foreground">
                  {t(locale, "update.codeLabel")}
                  <span className="ml-1 font-mono text-foreground">{updateInfo.baiduCode}</span>
                </div>
              )}
            </div>

            {(!updateInfo.githubUrl && !updateInfo.baiduUrl) && (
              <p className="text-xs text-destructive">{t(locale, "update.noDownloadLink")}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              {updateInfo.githubUrl && (
                <Button
                  className="flex-1"
                  onClick={() => void handleOpenLink(updateInfo.githubUrl!)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t(locale, "update.githubDownload")}
                </Button>
              )}
              {updateInfo.baiduUrl && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => void handleOpenLink(updateInfo.baiduUrl!)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t(locale, "update.baiduDownload")}
                </Button>
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter className="gap-2">
          {onIgnoreVersion && (
            <Button
              variant="ghost"
              onClick={() => {
                onIgnoreVersion(updateInfo.latestVersion);
                onOpenChange(false);
              }}
            >
              {t(locale, "update.ignoreVersion")}
            </Button>
          )}
          <AlertDialogCancel>{t(locale, "update.later")}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
