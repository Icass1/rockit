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
            className="flex flex-row justify-center items-center py-2 h-full w-full max-w-4xl bg-[#1a1a1a]/80"
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
                        className={`h-full w-full flex justify-center items-center rounded-md ml-2 mr-2 transition-all gap-2 ${
                            activePage === page.href
                                ? "bg-white text-black"
                                : "text-white"
                        }`}
                    >
                        <div className="w-8 h-8 flex justify-center items-center">
                            <page.icon className="w-[1.35rem] h-[1.35rem]" />
                        </div>
                    </a>
                ))}
            <a
                href="/settings"
                title="Settings"
                className={`h-full w-full flex justify-center items-center rounded-md ml-2 mr-2 transition-all gap-2 ${
                    activePage === "/settings"
                        ? "bg-white text-black"
                        : "text-white"
                }`}
            >
                <div className="w-8 h-8 flex justify-center items-center">
                    <Settings className="w-[1.35rem] h-[1.35rem]" />
                </div>
            </a>
        </div>
        // </div>
    );
}
