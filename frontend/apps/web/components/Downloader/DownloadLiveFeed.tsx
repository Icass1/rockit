"use client";

import { useEffect } from "react";
import { useDownloadGroups } from "@/components/Downloader/useDownloadGroups";
import DownloadItem from "@/components/Downloader/DownloadItem";
import { DownloadInfo } from "@/lib/managers/downloaderManager";

export default function DownloadLiveFeed() {
  const { $downloads } = useDownloadGroups();

  useEffect(() => {
    // Scroll to bottom when new downloads are added
    const container = document.getElementById("downloads-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [$downloads]);

  const downloads = $downloads.get() || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Downloads</h3>
        <div className="text-sm text-neutral-400">
          {downloads.length} total
        </div>
      </div>
      
      <div id="downloads-container" className="space-y-2">
        {downloads.length > 0 ? (
          downloads.map((downloadInfo) => (
            <DownloadItem 
              key={downloadInfo.publicId} 
              download={{
                // We'll create a minimal media object that satisfies the DownloadItem props
                // In a real implementation, we would have the actual media data associated with downloads
                publicId: downloadInfo.publicId,
                provider: "unknown",
                providerUrl: "",
                name: `Download ${downloadInfo.publicId.substring(0, 8)}`,
                artists: [{ type: "artist", provider: "unknown", publicId: "unknown", url: "", providerUrl: "", name: "Unknown Artist", imageUrl: "" }],
                album: { type: "album", provider: "unknown", publicId: "unknown", name: "Unknown Album", imageUrl: "" },
                imageUrl: "",
                duration: 0,
                trackNumber: 0,
                year: 0,
                explicit: false,
                addedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }} as any}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c2.21 0 4 1.79 4 4h2c0-3.31-2.69-6-6-6S6 2.69 6 6h2c0-1.1.9-2 2-2z" />
            </svg>
            <p className="mt-4 text-neutral-500">No downloads yet. Paste a URL above to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}