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
import Image from "next/image";

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
                <div className="flex items-center relative md:hover:bg-[#272727] p-3 md:hover:cursor-pointer rounded-lg">
                    <span className="font-medium">
                        {session.data?.user.username} - {session.status}
                    </span>
                    <div className="min-w-10 min-h-10 bg-neutral-400 rounded-full overflow-hidden flex ml-4 items-center justify-center">
                        <Image
                            width={50}
                            height={50}
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
