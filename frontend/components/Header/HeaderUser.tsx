"use client";

import { LogOut, Settings } from "lucide-react";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuOption,
    PopupMenuTrigger,
} from "@/components/PopupMenu/PopupMenu";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function HeaderUser() {
    const router = useRouter();
    const $user = useStore(rockIt.userManager.userAtom);

    const handleLogOut = () => {
        console.warn("HeaderUser signOut");
        rockIt.userManager.signOut();
    };

    if (!$user) return;

    return (
        <PopupMenu>
            <PopupMenuTrigger>
                <div className="relative grid grid-cols-[1fr_40px] items-center gap-x-2 rounded-lg p-3 md:hover:cursor-pointer md:hover:bg-[#272727]">
                    <span className="w-full min-w-0 max-w-full truncate font-medium">
                        {$user.username}
                    </span>
                    <div className="flex min-h-10 min-w-10 items-center justify-center overflow-hidden rounded-full bg-neutral-400">
                        <Image
                            width={40}
                            height={40}
                            src={$user.image}
                            alt="User avatar"
                            className="h-full w-full select-none object-cover"
                        />
                    </div>
                </div>
            </PopupMenuTrigger>
            <PopupMenuContent>
                <PopupMenuOption
                    onClick={() => {
                        router.push("/settings");
                    }}
                >
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                </PopupMenuOption>
                <PopupMenuOption onClick={handleLogOut}>
                    <LogOut className="h-5 w-5" />
                    Log Out
                </PopupMenuOption>
            </PopupMenuContent>
        </PopupMenu>
    );
}
