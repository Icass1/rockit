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
import { useState } from "react";
import { langData } from "@/stores/lang";
import { getImageUrl } from "@/lib/getImageUrl";
import Image from "@/components/Image";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Navigation() {
    const [open, setOpen] = useState(false);

    const $pinnedLists = useStore(pinnedLists);

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
        <div
            className={
                "mx-auto pt-4 pb-4 min-h-0 max-h-full h-full transition-all duration-[400ms] bg-black/50 overflow-hidden select-none" +
                (open ? " w-56 " : " w-12 ")
            }
            onMouseEnter={() => {
                setOpen(true);
            }}
            onMouseLeave={() => {
                setOpen(false);
            }}
            style={{ backdropFilter: "blur(10px)" }}
        >
            <div className="w-56 flex flex-col gap-4 h-full">
                <div
                    className="w-8 h-8 rounded-md items-center justify-center mx-2 transition-all flex"
                    onClick={() => {
                        setOpen((value) => !value);
                    }}
                >
                    <Menu className="w-5 h-5" />
                </div>
                {pages
                    .filter((page) => typeof page != "undefined")
                    .map((page) => {
                        return (
                            <Link
                                key={page.href}
                                href={page.href}
                                title={page.title}
                                className={`h-8 rounded-md items-center ml-2 mr-2 transition-all flex gap-2 ${
                                    activePage === page.href
                                        ? "bg-white text-black"
                                        : "text-white md:hover:bg-[#414141]"
                                }`}
                            >
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <page.icon className="w-5 h-5" />
                                </div>
                                <label className="font-semibold cursor-pointer">
                                    {page.title}
                                </label>
                            </Link>
                        );
                    })}

                <div
                    className={`transition-all h-1 bg-neutral-600 ml-2 duration-[400ms] rounded-full ${
                        open ? "w-52" : "w-8"
                    }`}
                ></div>

                <div
                    className="h-4 rounded-md items-center ml-2 mr-2 transition-all flex gap-2 cursor-pointer"
                    style={{ fontSize: open ? "" : "0 px" }}
                >
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Pin className="w-5 h-5" />
                    </div>
                    <label className="text-md font-semibold cursor-pointer">
                        {$lang.pinned_lists}
                    </label>
                </div>
                <div className="h-full overflow-y-scroll flex flex-col gap-4">
                    {$pinnedLists.map((list) => {
                        return (
                            <Link
                                key={list.id}
                                href={`/${list.type}/${list.id}`}
                                title={list.name}
                                className={`h-8 rounded-md items-center ml-2 mr-2 transition-all flex gap-3 cursor-pointer md:hover:bg-[#414141]`}
                            >
                                <Image
                                    alt={list.name}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 min-w-8 min-h-8 flex items-center justify-center rounded-sm"
                                    src={getImageUrl({
                                        imageId: list.image,
                                        width: 32,
                                        height: 32,
                                        placeHolder: "/song-placeholder.png",
                                    })}
                                />
                                <label className="font-semibold text-sm truncate cursor-pointer">
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

                {/* <div className="h-full"></div> */}
                <Downloads navOpen={open} />
            </div>
        </div>
    );
}
