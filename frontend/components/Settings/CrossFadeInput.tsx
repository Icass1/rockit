"use client";

import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function CrossFadeInput() {
    const $crossFade = useStore(rockIt.audioManager.crossFadeAtom);

    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor="cross-fade-input"
                className="text-sm font-medium text-neutral-400"
            >
                Cross Fade
            </label>
            <div className="flex items-center gap-3">
                <input
                    id="cross-fade-input"
                    type="number"
                    value={$crossFade}
                    onChange={(e) =>
                        rockIt.userManager.setCrossFadeAsync(
                            Number(e.currentTarget.value)
                        )
                    }
                    max={40}
                    min={0}
                    className="w-20 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-center text-sm text-white transition-colors focus:border-[#ee1086] focus:outline-none focus:ring-1 focus:ring-[#ee1086]"
                />
                <span className="text-sm text-neutral-500">seconds</span>
            </div>
        </div>
    );
}
