"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import { networkStatus } from "@/lib/stores/networkStatus";
import { APP_VERSION } from "@/lib/version";
import HeaderPopover from "@/components/Header/HeaderPopover";
import { useClickOutside } from "@/components/Header/hooks/useClickOutside";

export default function HeaderUser(): JSX.Element {
    const router = useRouter();
    const $username = useStore(rockIt.userManager.usernameAtom);
    const $image = useStore(rockIt.userManager.imageAtom);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const $networkStatus = useStore(networkStatus);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const close = useCallback((): void => setOpen(false), []);
    useClickOutside(ref, close);

    useEffect(() => {
        if (!open) return;
        ref.current
            ?.querySelector<HTMLButtonElement>("#header-user-menu button")
            ?.focus();
        const handleKey = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open]);

    const handleLogOut = async (): Promise<void> => {
        if ($networkStatus === "offline") return;
        await rockIt.userManager.signOut();
        if (!rockIt.userManager.loggedInAtom.get()) router.push("/login");
    };

    return (
        <div ref={ref} className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((previous) => !previous)}
                aria-expanded={open}
                aria-controls={open ? "header-user-menu" : undefined}
                className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 transition focus-visible:outline-2 focus-visible:outline-(--rockit-pink) ${open ? "border-(--rockit-pink)/30 bg-(--rockit-pink)/15 text-(--rockit-pink)" : "border-transparent hover:bg-white/10"}`}
            >
                <span className="max-w-36 truncate text-sm font-medium">
                    {$username}
                </span>
                <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-700">
                    <Image
                        width={36}
                        height={36}
                        src={$image || rockIt.USER_PLACEHOLDER_IMAGE_URL}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                </span>
            </button>
            {open && (
                <HeaderPopover
                    id="header-user-menu"
                    label={$username}
                    className="w-64 max-w-[calc(100vw-2rem)]"
                >
                    <div className="border-b border-white/10 px-4 py-3">
                        <p className="truncate text-sm font-semibold">
                            {$username}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                            RockIt v{APP_VERSION}
                        </p>
                    </div>
                    <div className="p-1.5">
                        <button
                            onClick={() => {
                                close();
                                router.push("/settings");
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-(--rockit-pink)"
                        >
                            <Settings size={17} />
                            {$vocabulary.SETTINGS}
                        </button>
                        <button
                            disabled={$networkStatus === "offline"}
                            onClick={handleLogOut}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-(--rockit-pink) disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <LogOut size={17} />
                            {$vocabulary.LOG_OUT}
                        </button>
                    </div>
                </HeaderPopover>
            )}
        </div>
    );
}
