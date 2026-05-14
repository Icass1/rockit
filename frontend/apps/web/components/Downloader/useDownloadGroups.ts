import { useStore } from "@nanostores/react";
import { DownloadInfo } from "@/lib/managers/downloaderManager";
import { rockIt } from "@/lib/rockit/rockIt";

export function useDownloadGroups(): {
    total: number;
    active: DownloadInfo[];
    completed: DownloadInfo[];
    failed: DownloadInfo[];
    $downloads: DownloadInfo[];
} {
    const $downloads = useStore(rockIt.downloaderManager.downloadInfoAtom);

    const active = $downloads.filter(
        (d: DownloadInfo): boolean => d.completed < 100 && d.completed >= 0
    );
    const completed = $downloads.filter(
        (d: DownloadInfo): boolean => d.completed === 100
    );
    const failed = $downloads.filter(
        (d: DownloadInfo): boolean => d.completed === -1
    ); // Assuming -1 means failed
    const total = $downloads.length;

    return {
        total,
        active,
        completed,
        failed,
        $downloads,
    };
}
