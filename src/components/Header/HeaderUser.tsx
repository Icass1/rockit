"use client";

import { LogOut, Settings } from "lucide-react";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuOption,
    PopupMenuTrigger,
} from "@/components/PopupMenu/PopupMenu";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "@/components/Image";
import useDev from "@/hooks/useDev";

export default function HeaderUser() {
    const session = useSession();
    const router = useRouter();

    const handleLogOut = () => {
        signOut();
    };

    const dev = useDev();

    return (
        <PopupMenu>
            <PopupMenuTrigger>
                <div className="relative grid grid-cols-[1fr_40px] items-center gap-x-2 rounded-lg p-3 md:hover:cursor-pointer md:hover:bg-[#272727]">
                    <span className="w-full max-w-full min-w-0 truncate font-medium">
                        {session.data?.user.username}{" "}
                        {dev && ` - ${session.status}`}
                    </span>
                    <div className="flex min-h-10 min-w-10 items-center justify-center overflow-hidden rounded-full bg-neutral-400">
                        <Image
                            width={40}
                            height={40}
                            src="/user-placeholder.png"
                            alt="User avatar"
                            className="h-full w-full object-cover select-none"
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
