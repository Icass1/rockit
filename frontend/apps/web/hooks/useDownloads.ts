// Hook for downloader – mirrors mobile implementation

import { useCallback, useEffect, useState } from "react";
import type { DownloadProgressMessage } from "@rockit/shared";
import {
  DownloadsResponseSchema,
  MediaResponseSchema,
  OkResponseSchema,
  StartDownloadRequestSchema,
  StartDownloadResponseSchema,
  EWebSocketMessage,
} from "@rockit/shared";
import { apiFetch, apiPostFetch } from "@/lib/utils/apiFetch";
import { rockIt } from "@/lib/rockit/rockIt";

export interface DownloadInfo {
  publicId: string;
  groupId: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  status: string;
  completed: number;
  message: string;
  dateAdded: string;
}

export interface DownloadGroup {
  id: string;
  label: string;
  items: DownloadInfo[];
  isOpen: boolean;
  color: string;
  badgeColor: string;
}

export function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadInfo[]>([]);

  // ---------------------------------------------------------------------
  // Fetch all download groups from the backend and flatten to a list
  // ---------------------------------------------------------------------
  const fetchDownloads = useCallback(async () => {
    const response = await apiFetch("/downloader/downloads", DownloadsResponseSchema);
    if (!response.isOk()) {
      rockIt.notificationManager.notifyError(
        rockIt.vocabularyManager.vocabulary.ERROR_GETTING_DOWNLOADS
      );
      return;
    }
    const groups = response.result.downloads || [];
    const flat: DownloadInfo[] = [];
    for (const group of groups) {
      for (const item of group.items || []) {
        flat.push({
          publicId: item.publicId,
          groupId: group.publicId,
          title: item.name,
          subtitle: item.subtitle ?? null,
          imageUrl: item.imageUrl ?? null,
          status: item.message,
          // Mobile treats "Done" as completed (100)
          completed: item.message === "Done" ? 100 : item.completed,
          message: item.message,
          dateAdded: item.dateAdded ?? "",
        });
      }
    }
    setDownloads(flat);
  }, []);

  // ---------------------------------------------------------------------
  // Subscribe to real‑time progress updates via WebSocket
  // ---------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const handleDownloadProgress = (data: DownloadProgressMessage) => {
      if (cancelled) return;
      setDownloads((prev) => {
        const existing = prev.find((d) => d.publicId === data.publicId);
        const message = data.progress >= 100 ? "Done" : data.message;
        const completed = data.progress >= 100 ? 100 : data.progress;
        if (existing) {
          return prev.map((d) =>
            d.publicId === data.publicId
              ? {
                  ...d,
                  title: data.title || d.title,
                  subtitle: data.subTitle || d.subtitle,
                  status: message,
                  completed,
                  message,
                }
              : d
          );
        }
        // New download entry (unlikely but safe)
        return [
          ...prev,
          {
            publicId: data.publicId,
            groupId: "",
            title: data.title || data.publicId,
            subtitle: data.subTitle || null,
            imageUrl: null,
            status: message,
            completed,
            message,
            dateAdded: "",
          },
        ];
      });
    };

    rockIt.webSocketManager.onMessage(
      EWebSocketMessage.DownloadProgress,
      handleDownloadProgress
    );

    fetchDownloads();

    return () => {
      cancelled = true;
      rockIt.webSocketManager.offMessage(
        EWebSocketMessage.DownloadProgress,
        handleDownloadProgress
      );
    };
  }, [fetchDownloads]);

  // ---------------------------------------------------------------------
  // Start a download – resolve URL then launch download group
  // ---------------------------------------------------------------------
  const startDownload = async (url: string) => {
    try {
      // Resolve the external URL to an internal publicId
      const mediaRes = await apiFetch(
        `/media/url/add?url=${encodeURIComponent(url)}`,
        MediaResponseSchema
      );
      if (!mediaRes.isOk()) {
        rockIt.notificationManager.notifyError(
          rockIt.vocabularyManager.vocabulary.ERROR_STARTING_DOWNLOAD
        );
        console.error(mediaRes.message, mediaRes.detail);
        return { ok: false };
      }
      const publicId = mediaRes.result.publicId;

      // Start the actual download process
      const startRes = await apiPostFetch(
        "/downloader/start-downloads",
        StartDownloadRequestSchema,
        StartDownloadResponseSchema,
        { ids: [publicId], title: "Download" }
      );
      if (!startRes.isOk()) {
        rockIt.notificationManager.notifyError(
          rockIt.vocabularyManager.vocabulary.ERROR_STARTING_DOWNLOAD
        );
        console.error(startRes.message, startRes.detail);
        return { ok: false };
      }

      rockIt.notificationManager.notifySuccess(
        rockIt.vocabularyManager.vocabulary.DOWNLOAD_STARTED
      );
      // Refresh the list so the UI shows the new entry
      await fetchDownloads();
      return { ok: true };
    } catch (e) {
      console.error(e);
      rockIt.notificationManager.notifyError(
        rockIt.vocabularyManager.vocabulary.ERROR_STARTING_DOWNLOAD
      );
      return { ok: false };
    }
  };

  // ---------------------------------------------------------------------
  // Clear completed or failed groups (mark as seen)
  // ---------------------------------------------------------------------
  const clearCompleted = async () => {
    const completedGroups = new Set(
      downloads
        .filter((d) => d.completed === 100 && d.groupId)
        .map((d) => d.groupId)
    );
    for (const groupId of completedGroups) {
      await apiPostFetch(
        `/downloader/downloads/${groupId}/seen`,
        StartDownloadRequestSchema,
        OkResponseSchema,
        { ids: [], title: "" }
      );
    }
    setDownloads((prev) => prev.filter((d) => d.completed !== 100));
  };

  const clearFailed = async () => {
    const failedGroups = new Set(
      downloads
        .filter((d) => d.message === "Error" && d.groupId)
        .map((d) => d.groupId)
    );
    for (const groupId of failedGroups) {
      await apiPostFetch(
        `/downloader/downloads/${groupId}/seen`,
        StartDownloadRequestSchema,
        OkResponseSchema,
        { ids: [], title: "" }
      );
    }
    setDownloads((prev) => prev.filter((d) => d.message !== "Error"));
  };

  // ---------------------------------------------------------------------
  // Derive grouped view for UI
  // ---------------------------------------------------------------------
  const active = downloads.filter(
    (d) => d.completed < 100 && d.message !== "Error" && d.message !== "Done"
  );
  const completed = downloads.filter(
    (d) => d.completed === 100 || d.message === "Done"
  );
  const failed = downloads.filter((d) => d.message === "Error");

  const groups: DownloadGroup[] = [
    {
      id: "active",
      label: "Active",
      items: active,
      isOpen: true,
      color: "#ee1086",
      badgeColor: "rgba(238, 16, 134, 0.15)",
    },
    {
      id: "completed",
      label: "Completed",
      items: completed,
      isOpen: false,
      color: "#1cad60",
      badgeColor: "rgba(28, 173, 96, 0.15)",
    },
    {
      id: "failed",
      label: "Failed",
      items: failed,
      isOpen: true,
      color: "#c72e2e",
      badgeColor: "rgba(199, 46, 46, 0.15)",
    },
  ];

  return {
    downloads,
    groups,
    total: downloads.length,
    active,
    completed,
    failed,
    startDownload,
    clearCompleted,
    clearFailed,
  };
}
