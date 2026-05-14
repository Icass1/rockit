"use client";

import type { JSX } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { LogOut, Settings } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuOption,
    PopupMenuTrigger,
} from "@/components/PopupMenu";

export default function HeaderUser(): JSX.Element {
    const router = useRouter();
    const $username = useStore(rockIt.userManager.usernameAtom);
    const $image = useStore(rockIt.userManager.imageAtom);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const handleLogOut = (): void => {
        rockIt.userManager.signOut();
        router.push("/login");
    };

    return (
        <PopupMenu>
            <PopupMenuTrigger>
                <div className="relative grid grid-cols-[1fr_40px] items-center gap-x-2 rounded-lg p-2 transition md:hover:cursor-pointer md:hover:bg-[#272727]">
                    <span className="w-full min-w-0 truncate text-sm font-medium">
                        {$username}
                    </span>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-400">
                        <Image
                            width={40}
                            height={40}
                            src={$image}
                            alt={`${$username}'s avatar`}
                            className="h-full w-full object-cover"
                        />
                    </div>
                </div>
            </PopupMenuTrigger>

            <PopupMenuContent>
                <PopupMenuOption onClick={(): void => router.push("/settings")}>
                    <Settings className="h-5 w-5" />
                    <span>{$vocabulary.SETTINGS}</span>
                </PopupMenuOption>

                <PopupMenuOption onClick={handleLogOut}>
                    <LogOut className="h-5 w-5" />
                    <span>{$vocabulary.LOG_OUT}</span>
                </PopupMenuOption>
            </PopupMenuContent>
        </PopupMenu>
    );
}
