import { navigate } from "astro:transitions/client";
import { LogOut, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function HeaderUser({ userName }: { userName: string }) {
    const [open, setOpen] = useState(false);
    const [hidden, setHidden] = useState(false);

    const divRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            // Wait for animation to finish and hide the popup
            setTimeout(() => {
                setHidden(true);
            }, 300);
        } else {
            setHidden(false);
        }
    }, [open]);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (!divRef.current?.contains(event.target as HTMLElement)) {
                setOpen(false);
            }
        };

        document.addEventListener("click", handleDocumentClick);
        return () => {
            document.removeEventListener("click", handleDocumentClick);
        };
    }, []);

    const handleLogOut = () => {
        fetch("/api/logout").then(() => {
            navigate("/login");
        });
    };

    return (
        <div
            ref={divRef}
            className="flex items-center relative md:hover:bg-[#272727] p-3 md:hover:cursor-pointer rounded-lg"
            onClick={() => setOpen(true)}
        >
            <div
                className={
                    "absolute top-16 right-0 mt-2 w-48 bg-[#2f2f2f] shadow-lg rounded-lg z-40 transition-all " +
                    (open ? "" : " opacity-0 ") +
                    (hidden ? " hidden " : "")
                }
            >
                <ul className="text-white text-sm">
                    <a
                        href="/settings"
                        className="md:hover:bg-[#4f4f4f] flex items-center p-3 space-x-2 cursor-pointer rounded-t-lg"
                    >
                        <Settings className="h-5 w-5" />
                        <span>Settings</span>
                    </a>
                    <span
                        className="md:hover:bg-[#4f4f4f] flex items-center gap-x-2 p-3 space-x-2 cursor-pointer rounded-b-lg"
                        onClick={handleLogOut}
                    >
                        <LogOut className="h-5 w-5" />
                        Log Out
                    </span>
                </ul>
            </div>

            <span className="font-medium">{userName}</span>
            <div className="w-10 h-10 bg-neutral-400 rounded-full overflow-hidden flex ml-4 items-center justify-center">
                <img
                    src="/user-placeholder.png"
                    alt="User avatar"
                    className="w-full h-full object-cover select-none"
                />
            </div>
        </div>
    );
}
