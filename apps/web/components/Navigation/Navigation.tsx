"use client";

// import { Downloads } from "@/components/MusicDownloader";
import { useEffect, useRef, useState, type JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@nanostores/react";
import {
    ChartLine,
    Download,
    Home,
    Library,
    Menu,
    RadioTower,
    Search,
    ShieldEllipsis,
    Users,
} from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import NavigationPins from "@/components/Navigation/NavigationPins";

export default function Navigation(): JSX.Element {
    const [open, setOpen] = useState(false);
    const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const activePage = usePathname();
    const $admin = useStore(rockIt.userManager.admin);

    const handleMouseEnter = (): void => {
        hoverTimeout.current = setTimeout((): void => {
            setOpen(true);
        }, 500);
    };

    const handleMouseLeave = (): void => {
        if (hoverTimeout.current) {
            clearTimeout(hoverTimeout.current);
            hoverTimeout.current = null;
        }
        setOpen(false);
    };

    useEffect(
        () => () => {
            if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        },
        []
    );

    const $downloads = [];

    const pages = [
        {
            name: "Home",
            title: $vocabulary.HOME,
            href: "/",
            icon: Home,
        },
        {
            name: "Library",
            title: $vocabulary.LIBRARY,
            href: "/library",
            icon: Library,
        },
        {
            name: "Search",
            title: $vocabulary.SEARCH,
            href: "/search",
            icon: Search,
            disabled: false,
        },
        {
            name: "Friends",
            title: $vocabulary.FRIENDS,
            href: "/friends",
            icon: Users,
        },
        {
            name: "Radio",
            title: $vocabulary.RADIO,
            href: "/radio",
            icon: RadioTower,
        },
        {
            name: "Stats",
            title: $vocabulary.STATS,
            href: "/stats/v2",
            icon: ChartLine,
        },
        {
            name: "Downloads",
            title: $vocabulary.DOWNLOADS,
            href: "/downloader",
            icon: Download,
        },
        {
            name: "Admin" as const,
            title: "Admin",
            href: "/admin",
            icon: ShieldEllipsis,
            adminOnly: true,
        },
    ];

    return (
        <nav
            aria-label={$vocabulary.NAV_LABEL}
            onFocusCapture={(event) => {
                if ((event.target as Element).closest("a")) setOpen(true);
            }}
            className={
                "mx-auto h-full max-h-full min-h-0 overflow-hidden bg-black/50 pt-4 pb-4 transition-[width] duration-200 select-none motion-reduce:transition-none" +
                (open ? " w-56" : " w-12")
            }
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ backdropFilter: "blur(10px)" }}
        >
            <div className="flex h-full w-56 flex-col gap-2">
                <button
                    type="button"
                    aria-label={$vocabulary.NAV_TOGGLE}
                    aria-expanded={open}
                    className="mx-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-all focus-visible:outline-2 focus-visible:outline-white"
                    onClick={(): void => {
                        setOpen((value): boolean => !value);
                    }}
                >
                    <Menu aria-hidden className="h-5 w-5" />
                </button>
                {pages.map((page): JSX.Element => {
                    const hidden =
                        "adminOnly" in page && page.adminOnly && !$admin;
                    return (
                        <Link
                            key={page.href}
                            id={"navigation-" + page.name}
                            href={page.href}
                            title={page.title}
                            aria-hidden={hidden || undefined}
                            className={`relative mr-2 ml-2 flex h-8 shrink-0 items-center gap-2 rounded-md transition-all focus-visible:outline-2 focus-visible:outline-white ${
                                activePage === page.href
                                    ? "bg-white text-black"
                                    : "text-white md:hover:bg-(--color-hover-bg)"
                            } ${page.disabled === true ? "pointer-events-none opacity-50" : ""} ${hidden ? "hidden" : ""}`}
                        >
                            <div className="relative flex h-8 w-8 items-center justify-center">
                                {page.name === "Downloads" &&
                                    $downloads.length > 0 && (
                                        <label className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-400 text-center text-xs">
                                            {$downloads.length}
                                        </label>
                                    )}
                                <page.icon className="h-5 w-5" />
                            </div>
                            <span className="cursor-pointer font-semibold">
                                {page.title}
                            </span>
                        </Link>
                    );
                })}

                <NavigationPins expanded={open} />
            </div>
        </nav>
    );
}
