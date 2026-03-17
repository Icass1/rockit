"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@nanostores/react";
import type { LucideIcon } from "lucide-react";
import {
    Download,
    Home,
    Library,
    Search,
    Settings,
    ShieldEllipsis,
} from "lucide-react";
import { rockIt } from "@/packages/lib/rockit/rockIt";

interface NavPage {
    title: string;
    href: string;
    icon: LucideIcon;
    disabled?: boolean;
}

const DEFAULT_VOCABULARY = {
    HOME: "Home",
    LIBRARY: "Library",
    SEARCH: "Search",
    DOWNLOAD: "Downloads",
    SETTINGS: "Settings",
};

export default function NavigationMobile() {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const activePage = usePathname();
    const $user = useStore(rockIt.userManager.userAtom);

    const vocab =
        $vocabulary && Object.keys($vocabulary).length > 0
            ? $vocabulary
            : DEFAULT_VOCABULARY;

    const pages: NavPage[] = [
        { title: vocab.HOME, href: "/", icon: Home },
        { title: vocab.LIBRARY, href: "/library", icon: Library },
        { title: vocab.SEARCH, href: "/search", icon: Search },
        {
            title: vocab.DOWNLOAD,
            href: "/downloader",
            icon: Download,
            disabled: false,
        },
        { title: vocab.SETTINGS, href: "/settings", icon: Settings },
    ];

    if ($user?.admin) {
        pages.push({ title: "Admin", href: "/admin", icon: ShieldEllipsis });
    }

    return (
        <nav
            aria-label="Mobile navigation"
            className="safe-area-bottom mobile-nav-blur flex h-full w-full max-w-4xl touch-manipulation flex-row items-center justify-center bg-[#1a1a1a]/80 py-2"
        >
            {pages.map((page) => {
                const isActive = activePage === page.href;
                return (
                    <Link
                        key={page.href}
                        href={page.disabled ? "#" : page.href}
                        title={page.title}
                        aria-current={isActive ? "page" : undefined}
                        aria-disabled={page.disabled}
                        className={[
                            "mr-2 ml-2 flex h-full w-full items-center justify-center gap-2 rounded-md transition-all",
                            isActive ? "bg-white text-black" : "text-white",
                            page.disabled
                                ? "pointer-events-none opacity-50"
                                : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
                        <span className="flex h-8 w-8 items-center justify-center">
                            <page.icon
                                className="h-[1.35rem] w-[1.35rem]"
                                aria-hidden
                            />
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
