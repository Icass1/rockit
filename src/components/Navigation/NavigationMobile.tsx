"use client";

import { useStore } from "@nanostores/react";
import {
    Home,
    Library,
    Search,
    Users,
    ShieldEllipsis,
    Settings,
} from "lucide-react";
import { langData } from "@/stores/lang";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function NavigationMobile() {
    const session = useSession();

    const $lang = useStore(langData);

    const activePage = usePathname();

    if (!$lang) return false;

    const pages = [
        {
            name: "Home",
            title: $lang.home,
            href: "/",
            icon: Home,
        },
        {
            name: "Library",
            title: $lang.library,
            href: "/library",
            icon: Library,
        },
        {
            name: "Search",
            title: $lang.search,
            href: "/search",
            icon: Search,
            disabled: false,
        },
        {
            name: "Friends",
            title: $lang.friends,
            href: "/friends",
            icon: Users,
            disabled: false,
        },

        session.data?.user.admin
            ? {
                  name: "Admin",
                  title: "Admin",
                  href: "/admin",
                  icon: ShieldEllipsis,
              }
            : undefined,
    ];

    return (
        <div
            className="flex h-full w-full max-w-4xl flex-row items-center justify-center bg-[#1a1a1a]/80 py-2"
            style={{ backdropFilter: "blur(10px)" }}
        >
            {pages
                .filter((page) => typeof page != "undefined")
                .map((page) => (
                    <Link
                        key={page.href}
                        href={page.href}
                        title={page.title}
                        className={`mr-2 ml-2 flex h-full w-full items-center justify-center gap-2 rounded-md transition-all ${
                            activePage === page.href
                                ? "bg-white text-black"
                                : "text-white"
                        } ${
                            page.disabled == true
                                ? "pointer-events-none opacity-50"
                                : ""
                        }`}
                    >
                        <div className="flex h-8 w-8 items-center justify-center">
                            <page.icon className="h-[1.35rem] w-[1.35rem]" />
                        </div>
                    </Link>
                ))}
            <Link
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
            </Link>
        </div>
    );
}
