"use client";

import { useEffect } from "react";
import { rockIt } from "@/lib/rockit/rockIt";
import DownloadInputBar from "@/components/Downloader/DownloadInputBar";
import DownloadGroup from "@/components/Downloader/DownloadGroup";
import { useDownloads } from "@/hooks/useDownloads";

export default function DownloaderClient() {
  // Initialise manager for low‑level progress handling (kept for compatibility)
  useEffect(() => {
    rockIt.downloaderManager.init();
  }, []);

  const {
    groups,
    total,
    startDownload,
    clearCompleted,
    clearFailed,
  } = useDownloads();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-neutral-900/50 p-4">
        <h2 className="mb-4 text-xl font-semibold">Downloader</h2>
        <DownloadInputBar onSubmit={async (url) => { await startDownload(url); }} />
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <DownloadGroup
            key={group.id}
            group={group}
            onClear={
              group.id === "completed"
                ? clearCompleted
                : group.id === "failed"
                ? clearFailed
                : undefined
            }
          />
        ))}
        <div className="text-sm text-neutral-400">{total} total</div>
      </div>
    </div>
  );
}

