"use client";

import { LogOut, Settings } from "lucide-react";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuOption,
    PopupMenuTrigger,
} from "../PopupMenu/PopupMenu";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "@/components/Image";

export default function HeaderUser() {
    const session = useSession();
    const router = useRouter();

    const handleLogOut = () => {
        fetch("/api/logout").then(() => {
            router.push("/login");
        });
    };

    return (
        <PopupMenu>
            <PopupMenuTrigger>
                <div className="grid grid-cols-[1fr_40px] items-center relative md:hover:bg-[#272727] gap-x-2 p-3 md:hover:cursor-pointer rounded-lg">
                    <span className="font-medium min-w-0 max-w-full w-full truncate">
                        {session.data?.user.username} - {session.status}
                    </span>
                    <div className="min-w-10 min-h-10 bg-neutral-400 rounded-full overflow-hidden flex items-center justify-center">
                        <Image
                            width={40}
                            height={40}
                            src="/user-placeholder.png"
                            alt="User avatar"
                            className="w-full h-full object-cover select-none"
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
