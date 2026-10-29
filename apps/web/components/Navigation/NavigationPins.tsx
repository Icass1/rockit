"use client";

import { useState, type JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@nanostores/react";
import type { NavigationPinResponse } from "@rockit/shared";
import { LoaderCircle, Pin, PinOff } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

function PinShortcut({
    pin,
    expanded,
    busy,
}: {
    pin: NavigationPinResponse;
    expanded: boolean;
    busy: boolean;
}): JSX.Element {
    const activePage = usePathname();
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const fallback =
        pin.type === "artist"
            ? "/user-placeholder.png"
            : pin.type === "playlist"
              ? "/playlist-placeholder.png"
              : "/song-placeholder.png";
    const [failed, setFailed] = useState<string | null>(null);
    const cover = pin.imageUrl || fallback;
    return (
        <li className="group mx-2 flex min-h-10 shrink-0 items-center rounded-md">
            <Link
                href={pin.url}
                title={pin.name}
                aria-label={pin.name}
                aria-current={activePage === pin.url ? "page" : undefined}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 focus-visible:outline-2 focus-visible:outline-white ${activePage === pin.url ? "bg-white/15" : "hover:bg-white/10"}`}
            >
                <Image
                    src={failed === cover ? fallback : cover}
                    alt=""
                    width={32}
                    height={32}
                    className={`h-8 w-8 shrink-0 object-cover ${pin.type === "artist" ? "rounded-full" : "rounded-md"}`}
                    onError={() => setFailed(cover)}
                />
                {expanded && (
                    <span className="truncate text-sm font-semibold">
                        {pin.name}
                    </span>
                )}
            </Link>
            {expanded && (
                <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                        void rockIt.navigationPinsManager.setPinnedAsync(
                            pin.publicId,
                            false
                        )
                    }
                    title={vocabulary.NAV_UNPIN}
                    aria-label={vocabulary.NAV_UNPIN_ITEM.replace(
                        "{name}",
                        pin.name
                    )}
                    className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50"
                >
                    {busy ? (
                        <LoaderCircle
                            aria-hidden
                            className="h-4 w-4 animate-spin motion-reduce:animate-none"
                        />
                    ) : (
                        <PinOff aria-hidden className="h-4 w-4" />
                    )}
                </button>
            )}
        </li>
    );
}

export default function NavigationPins({
    expanded,
}: {
    expanded: boolean;
}): JSX.Element {
    const pins = useStore(rockIt.navigationPinsManager.pinsAtom);
    const pending = useStore(rockIt.navigationPinsManager.pendingAtom);
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    // Both empty SSR and the initial client render have no section or divider.
    if (pins.length === 0) return <></>;
    return (
        <section
            aria-label={vocabulary.NAV_PINNED}
            className="flex min-h-0 flex-1 flex-col"
            data-navigation-pins
        >
            <div
                aria-hidden="true"
                className={`mt-2 mb-3 border-t border-neutral-700/70 ${expanded ? "ml-4 w-44" : "ml-3.5 w-5"}`}
            />
            <div
                className="mx-2 mb-2 flex h-7 shrink-0 items-center gap-2 text-neutral-400"
                title={vocabulary.NAV_PINNED}
            >
                <span className="flex h-7 w-8 shrink-0 items-center justify-center">
                    <Pin aria-hidden className="h-4 w-4" />
                </span>
                {expanded && (
                    <h2 className="truncate text-xs font-semibold tracking-wide uppercase">
                        {vocabulary.NAV_PINNED}
                    </h2>
                )}
            </div>
            <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-1">
                {pins.map((pin) => (
                    <PinShortcut
                        key={pin.publicId}
                        pin={pin}
                        expanded={expanded}
                        busy={pending.includes(pin.publicId)}
                    />
                ))}
            </ul>
        </section>
    );
}
