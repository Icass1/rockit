"use client";

import { useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { useSettingsFeedback } from "@/hooks/useSettingsFeedback";
import { rockIt } from "@/lib/rockit/rockIt";

export default function ListeningHistorySetting(): JSX.Element {
    const enabled = useStore(rockIt.userManager.showListeningHeatmapAtom);
    const [saving, setSaving] = useState(false);
    const notifySaved = useSettingsFeedback();

    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <label
                    htmlFor="show-listening-heatmap"
                    className="text-sm font-medium"
                >
                    Show listening history in the player
                </label>
                <p className="mt-1 text-xs text-neutral-400">
                    Display the listening heatmap and history popup above the
                    progress bar.
                </p>
            </div>
            <input
                id="show-listening-heatmap"
                type="checkbox"
                checked={enabled}
                disabled={saving}
                className="h-4 w-4 shrink-0 accent-(--color-rockit-pink)"
                onChange={async (event): Promise<void> => {
                    setSaving(true);
                    try {
                        if (
                            await rockIt.userManager.setListeningHeatmapAsync(
                                event.target.checked
                            )
                        )
                            notifySaved();
                    } finally {
                        setSaving(false);
                    }
                }}
            />
        </div>
    );
}
