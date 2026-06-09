"use client";

import { JSX } from "react";
import { useStore } from "@nanostores/react";
import { ETransitionProfile } from "@/lib/audio/TransitionEngine";
import { rockIt } from "@/lib/rockit/rockIt";

const PROFILES: { value: ETransitionProfile; label: string }[] = [
    { value: ETransitionProfile.CROSSFADE, label: "Default Crossfade" },
    { value: ETransitionProfile.BACKSPIN, label: "Backspin" },
    { value: ETransitionProfile.VINYL_STOP, label: "Vinyl Stop" },
    { value: ETransitionProfile.REVERB_OUT, label: "Reverb Out" },
    { value: ETransitionProfile.CUT, label: "Direct Cut" },
];

export default function TransitionProfileInput(): JSX.Element {
    const $profile = useStore(rockIt.mediaPlayerManager.transitionProfileAtom);

    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor="transition-profile"
                className="text-sm font-medium text-neutral-400"
            >
                Transition Profile
            </label>
            <select
                id="transition-profile"
                value={$profile}
                onChange={(e): void => {
                    const profile = e.currentTarget.value as ETransitionProfile;
                    rockIt.mediaPlayerManager.setTransitionProfile(profile);
                }}
                className="w-48 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-white transition-colors focus:border-[#ee1086] focus:ring-1 focus:ring-[#ee1086] focus:outline-none"
            >
                {PROFILES.map((p): JSX.Element => (
                    <option key={p.value} value={p.value}>
                        {p.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
