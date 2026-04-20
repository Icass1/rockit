"use client";

import { useState } from "react";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import DownloadItem from "@/components/Downloader/DownloadItem";
import type { DownloadInfo, DownloadGroup as DownloadGroupType } from "@/hooks/useDownloads";
import type { BaseSongWithAlbumResponse } from "@/dto";

/** Convert a DownloadInfo into a mock BaseSongWithAlbumResponse for the existing UI */
function toBaseSong(item: DownloadInfo): BaseSongWithAlbumResponse {
  return {
    type: "song",
    provider: "unknown",
    publicId: item.publicId,
    providerUrl: "",
    name: item.title,
    artists: [
      {
        type: "artist",
        provider: "unknown",
        publicId: "unknown",
        url: "",
        providerUrl: "",
        name: "Unknown Artist",
        imageUrl: "",
      },
    ],
    audioSrc: null,
    downloaded: false,
    imageUrl: item.imageUrl ?? "",
    duration_ms: 0,
    discNumber: 0,
    trackNumber: 0,
    album: {
      type: "album",
      provider: "unknown",
      publicId: "unknown",
      url: "",
      providerUrl: "",
      name: "Unknown Album",
      artists: [],
      releaseDate: "",
      imageUrl: "",
    },
  };
}

interface DownloadGroupProps {
  group: DownloadGroupType;
  onClear?: () => void;
}

export default function DownloadGroup({ group, onClear }: DownloadGroupProps) {
  const [open, setOpen] = useState(group.isOpen);

  if (!group.items.length) return null;

  const avgProgress =
    group.id === "active"
      ? Math.round(
          group.items.reduce((sum, i) => sum + i.completed, 0) / group.items.length
        )
      : null;

  return (
    <div className="rounded border border-neutral-600 bg-neutral-900/30 p-2">
      <button
        type="button"
        className="flex w-full items-center justify-between py-1"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown size={14} className="text-neutral-400" />
          ) : (
            <ChevronRight size={14} className="text-neutral-400" />
          )}
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: group.color }}
          />
          <span className="font-medium text-white">{group.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {onClear && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-neutral-400 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          )}
          <span
            className="rounded px-2 py-0.5 text-xs"
            style={{ backgroundColor: group.badgeColor }}
          >
            {group.items.length}
          </span>
          {avgProgress !== null && (
            <span className="text-xs text-neutral-400">{avgProgress}% avg</span>
          )}
        </div>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {group.items.map((item) => (
            <DownloadItem key={item.publicId} download={toBaseSong(item)} />
          ))}
        </div>
      )}
    </div>
  );
}
