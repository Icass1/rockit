"use client";

import { useCallback, useRef, useState, type JSX } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { rockIt } from "@/lib/rockit/rockIt";
import { APP_VERSION } from "@/lib/version";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import { useSettingsUser } from "@/components/Settings/hooks/useSettingsUser";
import Popover from "@/components/ui/Popover";

export default function HeaderUser(): JSX.Element {
    const router = useRouter();
    const { userManager } = useRuntimeServices();
    const { username: $username, image: $image } = useSettingsUser();
    const $vocabulary = useVocabulary();
    const $networkStatus = useNetworkStatus();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const close = useCallback((): void => setOpen(false), []);

    const handleLogOut = async (): Promise<void> => {
        if ($networkStatus === "offline") return;
        await userManager.signOut();
        if (!userManager.loggedInAtom.get()) router.push("/login");
    };

    return (
        <div ref={ref} className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((previous) => !previous)}
                aria-label={$username}
                aria-expanded={open}
                aria-controls={open ? "header-user-menu" : undefined}
                className={`focus-visible:outline-primary flex min-h-11 items-center gap-2 rounded-xl border px-2 py-1.5 transition focus-visible:outline-2 ${open ? "border-primary/30 bg-primary/15 text-primary-soft" : "hover:bg-foreground-strong/10 border-transparent"}`}
            >
                <span className="hidden max-w-36 truncate text-sm font-medium xl:block">
                    {$username}
                </span>
                <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
                <span className="bg-accent h-9 w-9 shrink-0 overflow-hidden rounded-full">
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
                <Popover
                    id="header-user-menu"
                    label={$username}
                    onClose={close}
                    className="w-64 max-w-[calc(100vw-2rem)]"
                >
                    <div className="border-foreground-strong/10 border-b px-4 py-3">
                        <p className="truncate text-sm font-semibold">
                            {$username}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                            RockIt! v{APP_VERSION}
                        </p>
                    </div>
                    <div className="p-1.5">
                        <button
                            onClick={() => {
                                close();
                                router.push("/settings");
                            }}
                            className="text-foreground hover:bg-foreground-strong/10 focus-visible:outline-primary flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm focus-visible:outline-2"
                        >
                            <Settings size={17} />
                            {$vocabulary.SETTINGS}
                        </button>
                        <button
                            disabled={$networkStatus === "offline"}
                            onClick={handleLogOut}
                            className="text-foreground hover:bg-foreground-strong/10 focus-visible:outline-primary flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <LogOut size={17} />
                            {$vocabulary.LOG_OUT}
                        </button>
                    </div>
                </Popover>
            )}
        </div>
    );
}
