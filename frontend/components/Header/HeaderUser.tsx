"use client";

import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuOption,
    PopupMenuTrigger,
} from "@/components/PopupMenu/PopupMenu";

export default function HeaderUser() {
    const router = useRouter();
    const $user = useStore(rockIt.userManager.userAtom);

    if (!$user) return null;

    const handleLogOut = () => rockIt.userManager.signOut();

    return (
        <PopupMenu>
            <PopupMenuTrigger>
                <div className="relative grid grid-cols-[1fr_40px] items-center gap-x-2 rounded-lg p-2 transition md:hover:cursor-pointer md:hover:bg-[#272727]">
                    <span className="w-full min-w-0 max-w-full truncate text-sm font-medium">
                        {$user.username}
                    </span>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-400">
                        <Image
                            width={40}
                            height={40}
                            src={$user.image}
                            alt={`${$user.username}'s avatar`}
                            className="h-full w-full select-none object-cover"
                        />
                    </div>
                </div>
            </PopupMenuTrigger>
            <PopupMenuContent>
                <PopupMenuOption onClick={() => router.push("/settings")}>
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                </PopupMenuOption>
                <PopupMenuOption onClick={handleLogOut}>
                    <LogOut className="h-5 w-5" />
                    <span>Log Out</span>
                </PopupMenuOption>
            </PopupMenuContent>
        </PopupMenu>
    );
}
