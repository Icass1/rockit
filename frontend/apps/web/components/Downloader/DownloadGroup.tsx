"use client";

import { useState, type JSX } from "react";
import { DownloadGroupResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import DownloadItem from "@/components/Downloader/DownloadItem";

interface DownloadGroupProps {
    group: DownloadGroupResponse;
    onClear?: () => void;
}

export default function DownloadGroup({
    group,
    onClear,
}: DownloadGroupProps): JSX.Element | null {
    const [open, setOpen] = useState(false);
    const avgProgress = 34;

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    return (
        <div className="rounded border border-neutral-600 bg-neutral-900/30 p-2">
            <button
                type="button"
                className="flex w-full items-center justify-between py-1"
                onClick={(): void => setOpen(!open)}
            >
                <div className="flex items-center gap-2">
                    {open ? (
                        <ChevronDown size={14} className="text-neutral-400" />
                    ) : (
                        <ChevronRight size={14} className="text-neutral-400" />
                    )}
                    <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                            backgroundColor:
                                group.fail > 0
                                    ? "#c72e2e"
                                    : group.success > 0
                                      ? "#1cad60"
                                      : "#ee1086",
                        }}
                    />
                    <span className="font-medium text-white">{group.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    {onClear && (
                        <button
                            type="button"
                            onClick={(e): void => {
                                e.stopPropagation();
                                onClear();
                            }}
                            className="text-neutral-400 hover:text-red-500"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                    <span className="rounded bg-neutral-700 px-2 py-0.5 text-xs">
                        {group.items.length}
                    </span>
                    {avgProgress !== null && (
                        <span className="text-xs text-neutral-400">
                            {avgProgress}% avg
                        </span>
                    )}
                </div>
            </button>

            {open && (
                <div className="mt-2 space-y-2">
                    {group.items.map(
                        (item): JSX.Element => (
                            <DownloadItem key={item.publicId} download={item} />
                        )
                    )}
                    {group.items.length === 0 && (
                        <label>{$vocabulary.NO_DOWNLOADS}</label>
                    )}
                </div>
            )}
        </div>
    );
}
