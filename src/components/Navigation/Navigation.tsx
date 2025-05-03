"use client";

import { Downloads } from "@/components/MusicDownloader";
import { pinnedLists } from "@/stores/pinnedLists";
import { useStore } from "@nanostores/react";
import {
    Home,
    Menu,
    Library,
    Search,
    Pin,
    ChartLine,
    Users,
    RadioTower,
    ShieldEllipsis,
} from "lucide-react";
import { useState, useRef } from "react";
import { langData } from "@/stores/lang";
import { getImageUrl } from "@/lib/getImageUrl";
import Image from "@/components/Image";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Navigation() {
    const [open, setOpen] = useState(false);
    const hoverTimeout = useRef<NodeJS.Timeout | null>(null); // Referencia para el temporizador

    // Temporizador para abrir el menú
    const handleMouseEnter = () => {
        hoverTimeout.current = setTimeout(() => {
            setOpen(true);
        }, 1000);
    };

    const handleMouseLeave = () => {
        if (hoverTimeout.current) {
            clearTimeout(hoverTimeout.current); // Limpia el temporizador si el mouse sale antes de tiempo
            hoverTimeout.current = null;
        }
        setOpen(false);
    };

    const $pinnedLists = useStore(pinnedLists);

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
        {
            name: "Radio",
            title: $lang.radio,
            href: "/radio",
            icon: RadioTower,
        },
        {
            name: "Stats",
            title: $lang.stats,
            href: "/stats",
            icon: ChartLine,
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
            className={
                "mx-auto h-full max-h-full min-h-0 overflow-hidden bg-black/50 pt-4 pb-4 transition-all duration-[400ms] select-none" +
                (open ? " w-56" : " w-12")
            }
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ backdropFilter: "blur(10px)" }}
        >
            <div className="flex h-full w-56 flex-col gap-4">
                <div
                    className="mx-2 flex h-8 w-8 items-center justify-center rounded-md transition-all"
                    onClick={() => {
                        setOpen((value) => !value);
                    }}
                >
                    <Menu className="h-5 w-5" />
                </div>
                {pages
                    .filter((page) => typeof page != "undefined")
                    .map((page) => {
                        return (
                            <Link
                                key={page.href}
                                href={page.href}
                                title={page.title}
                                className={`mr-2 ml-2 flex h-8 items-center gap-2 rounded-md transition-all ${
                                    activePage === page.href
                                        ? "bg-white text-black"
                                        : "text-white md:hover:bg-[#414141]"
                                } ${
                                    page.disabled == true
                                        ? "pointer-events-none opacity-50"
                                        : ""
                                }`}
                            >
                                <div className="flex h-8 w-8 items-center justify-center">
                                    <page.icon className="h-5 w-5" />
                                </div>
                                <label className="cursor-pointer font-semibold">
                                    {page.title}
                                </label>
                            </Link>
                        );
                    })}

                <div
                    className={`ml-2 h-1 rounded-full bg-neutral-600 transition-all duration-[400ms] ${
                        open ? "w-52" : "w-8"
                    }`}
                ></div>

                <div
                    className="mr-2 ml-2 flex h-4 cursor-pointer items-center gap-2 rounded-md transition-all"
                    style={{ fontSize: open ? "" : "0 px" }}
                >
                    <div className="flex h-8 w-8 items-center justify-center">
                        <Pin className="h-5 w-5" />
                    </div>
                    <label className="text-md cursor-pointer font-semibold">
                        {$lang.pinned_lists}
                    </label>
                </div>
                <div className="flex h-full flex-col gap-4 overflow-y-scroll">
                    {$pinnedLists.map((list) => {
                        return (
                            <Link
                                key={list.id}
                                href={`/${list.type}/${list.id}`}
                                title={list.name}
                                className={`mr-2 ml-2 flex h-8 cursor-pointer items-center gap-3 rounded-md transition-all md:hover:bg-[#414141]`}
                            >
                                <Image
                                    alt={list.name}
                                    width={32}
                                    height={32}
                                    className="flex h-8 min-h-8 w-8 min-w-8 items-center justify-center rounded-sm"
                                    src={getImageUrl({
                                        imageId: list.image,
                                        width: 32,
                                        height: 32,
                                        placeHolder: "/song-placeholder.png",
                                    })}
                                />
                                <label className="cursor-pointer truncate text-sm font-semibold">
                                    {list.name}
                                </label>
                            </Link>
                        );
                    })}
                    {/* Mockup de Pinned Artist */}
                    {/* <Link
                        href={`/artist/0`}
                        title={"Artist Mockup"}
                        className={`h-8 rounded-full items-center ml-2 mr-2 transition-all flex gap-3 md:hover:bg-[#414141] cursor-pointer`}
                    >
                        <Image

                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            src={"/user-placeholder.png"}
                        />
                        <label className="font-semibold text-sm truncate cursor-pointer">
                            Artist Mockup
                        </label>
                    </Link> */}
                </div>

                <Downloads navOpen={open} />
            </div>
        </div>
    );
}
