"use client";

// import { Downloads } from "@/components/MusicDownloader";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@nanostores/react";
import {
    ChartLine,
    Download,
    Home,
    Library,
    Menu,
    Pin,
    RadioTower,
    Search,
    ShieldEllipsis,
    Users,
} from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Navigation() {
    const [open, setOpen] = useState(false);
    const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        hoverTimeout.current = setTimeout(() => {
            setOpen(true);
        }, 500);
    };

    const handleMouseLeave = () => {
        if (hoverTimeout.current) {
            clearTimeout(hoverTimeout.current);
            hoverTimeout.current = null;
        }
        setOpen(false);
    };

    const $downloads = [];

    const $pinnedLists = useStore(rockIt.listManager.pinnedListsAtom);

    const { langFile: lang } = useLanguage();

    const activePage = usePathname();

    const user = useStore(rockIt.userManager.userAtom);

    if (!lang) return false;

    const pages = [
        {
            name: "Home",
            title: lang.home,
            href: "/",
            icon: Home,
        },
        {
            name: "Library",
            title: lang.library,
            href: "/library",
            icon: Library,
        },
        {
            name: "Search",
            title: lang.search,
            href: "/search",
            icon: Search,
            disabled: false,
        },
        {
            name: "Friends",
            title: lang.friends,
            href: "/friends",
            icon: Users,
            disabled: true,
        },
        {
            name: "Radio",
            title: lang.radio,
            href: "/radio",
            icon: RadioTower,
        },
        {
            name: "Stats",
            title: lang.stats,
            href: "/stats",
            icon: ChartLine,
        },
        {
            name: "Downloads",
            title: lang.downloads,
            href: "/downloader",
            icon: Download,
        },
        user?.admin
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
                                id={"navigation-" + page.name}
                                href={page.href}
                                title={page.title}
                                className={`relative mr-2 ml-2 flex h-8 items-center gap-2 rounded-md transition-all ${
                                    activePage === page.href
                                        ? "bg-white text-black"
                                        : "text-white md:hover:bg-[#414141]"
                                } ${
                                    page.disabled == true
                                        ? "pointer-events-none opacity-50"
                                        : ""
                                }`}
                            >
                                <div className="relative flex h-8 w-8 items-center justify-center">
                                    {page.name == "Downloads" &&
                                        $downloads.length > 0 && (
                                            <label className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-400 text-center text-xs">
                                                {$downloads.length}
                                            </label>
                                        )}
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
                        {lang.pinned_lists}
                    </label>
                </div>
                <div className="flex h-full flex-col gap-4 overflow-y-scroll">
                    {$pinnedLists.map((list) => {
                        return (
                            <Link
                                key={list.publicId}
                                href={`/${list.type}/${list.publicId}`}
                                title={list.name}
                                className={`mr-2 ml-2 flex h-8 cursor-pointer items-center gap-3 rounded-md transition-all md:hover:bg-[#414141]`}
                            >
                                <Image
                                    alt={list.name}
                                    width={32}
                                    height={32}
                                    className="flex h-8 min-h-8 w-8 min-w-8 items-center justify-center rounded-sm"
                                    src={
                                        list.internalImageUrl ??
                                        (list.type == "album"
                                            ? rockIt.ALBUM_PLACEHOLDER_IMAGE_URL
                                            : rockIt.PLAYLIST_PLACEHOLDER_IMAGE_URL)
                                    }
                                />
                                <label className="cursor-pointer truncate text-sm font-semibold">
                                    {list.name}
                                </label>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
