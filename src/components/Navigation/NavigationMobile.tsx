"use client";

import { useStore } from "@nanostores/react";
import {
    Home,
    Library,
    Search,
    ChartLine,
    Users,
    RadioTower,
    ShieldEllipsis,
    Settings,
} from "lucide-react";
import { langData } from "@/stores/lang";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function NavigationMobile() {
    const session = useSession();

    const $lang = useStore(langData);

    const activePage = usePathname();

    if (!$lang) return;

    const pages = [
        {
            name: "Home",
            title: $lang.home,
            href: "/",
            icon: Home,
            mobile: true,
        },
        {
            name: "Library",
            title: $lang.library,
            href: "/library",
            icon: Library,
            mobile: true,
        },
        {
            name: "Search",
            title: $lang.search,
            href: "/search",
            icon: Search,
            mobile: true,
        },
        {
            name: "Friends",
            title: $lang.friends,
            href: "/friends",
            icon: Users,
            mobile: true,
        },
        {
            name: "Radio",
            title: $lang.radio,
            href: "/radio",
            icon: RadioTower,
            mobile: false,
        },
        {
            name: "Stats",
            title: $lang.stats,
            href: "/stats",
            icon: ChartLine,
            mobile: false,
        },
        session.data?.user.admin
            ? {
                  name: "Admin",
                  title: "Admin",
                  href: "/admin",
                  icon: ShieldEllipsis,
                  mobile: true,
              }
            : undefined,
    ];

    return (
        // <div className="flex justify-center items-center py-2 w-full mx-auto min-w-0 max-w-full bg-[#1a1a1a] h-full">
        <div
            className="flex h-full w-full max-w-4xl flex-row items-center justify-center bg-[#1a1a1a]/80 py-2"
            style={{ backdropFilter: "blur(10px)" }}
        >
            {pages
                .filter((page) => typeof page != "undefined")
                .filter((page) => page.mobile)
                .map((page) => (
                    <a
                        key={page.href}
                        href={page.href}
                        title={page.title}
                        className={`mr-2 ml-2 flex h-full w-full items-center justify-center gap-2 rounded-md transition-all ${
                            activePage === page.href
                                ? "bg-white text-black"
                                : "text-white"
                        }`}
                    >
                        <div className="flex h-8 w-8 items-center justify-center">
                            <page.icon className="h-[1.35rem] w-[1.35rem]" />
                        </div>
                    </a>
                ))}
            <a
                href="/settings"
                title="Settings"
                className={`mr-2 ml-2 flex h-full w-full items-center justify-center gap-2 rounded-md transition-all ${
                    activePage === "/settings"
                        ? "bg-white text-black"
                        : "text-white"
                }`}
            >
                <div className="flex h-8 w-8 items-center justify-center">
                    <Settings className="h-[1.35rem] w-[1.35rem]" />
                </div>
            </a>
        </div>
        // </div>
    );
}
