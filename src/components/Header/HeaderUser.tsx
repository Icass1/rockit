import { navigate } from "astro:transitions/client";
import { LogOut, Settings } from "lucide-react";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuOption,
    PopupMenuTrigger,
} from "../PopupMenu/PopupMenu";

export default function HeaderUser({ userName }: { userName: string }) {
    const handleLogOut = () => {
        fetch("/api/logout").then(() => {
            navigate("/login");
        });
    };

    return (
        <PopupMenu>
            <PopupMenuTrigger>
                <div className="flex items-center relative md:hover:bg-[#272727] p-3 md:hover:cursor-pointer rounded-lg">
                    <span className="font-medium">{userName}</span>
                    <div className="w-10 h-10 bg-neutral-400 rounded-full overflow-hidden flex ml-4 items-center justify-center">
                        <img
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
                        navigate("/settings");
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
