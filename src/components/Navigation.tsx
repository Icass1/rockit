import useWindowSize from "@/hooks/useWindowSize";
import Downloads from "./MusicDownloader";
import { pinnedLists } from "@/stores/pinnedLists";
import { useStore } from "@nanostores/react";
import {
    Home,
    Menu,
    Library,
    Search,
    Pin,
    ChartLine,
    Settings,
    Users,
    RadioTower,
    ShieldEllipsis,
} from "lucide-react";
import { useState } from "react";
import { langData } from "@/stores/lang";

export default function Navigation({
    activePage,
    admin,
}: {
    activePage: string;
    admin: string | undefined;
}) {
    const [open, setOpen] = useState(false);

    const $pinnedLists = useStore(pinnedLists);
    const [innerWidth] = useWindowSize();

    const $lang = useStore(langData);
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
        admin == "1"
            ? {
                  name: "Admin",
                  title: "Admin",
                  href: "/admin",
                  icon: ShieldEllipsis,
                  mobile: true,
              }
            : undefined,
    ];

    if (innerWidth < 768) {
        return (
            <>
                <div className="flex justify-center items-center py-2 w-full mx-auto min-w-0 max-w-full bg-[#1a1a1a]">
                    <div className="flex flex-row justify-center items-center md:pb-0 pb-4 w-full max-w-4xl">
                        {pages
                            .filter((page) => typeof page != "undefined")
                            .filter((page) => page.mobile)
                            .map((page) => (
                                <a
                                    key={page.href}
                                    href={page.href}
                                    title={page.title}
                                    className={`h-full w-full flex justify-center items-center md:h-8 rounded-md ml-2 mr-2 transition-all gap-2 ${
                                        activePage === page.name
                                            ? "bg-white text-black"
                                            : "text-white md:hover:bg-[#414141]"
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
                            className={`h-full w-full flex justify-center items-center md:h-8 rounded-md ml-2 mr-2 transition-all gap-2 ${
                                activePage === "Settings"
                                    ? "bg-white text-black"
                                    : "text-white md:hover:bg-[#414141]"
                            }`}
                        >
                            <div className="w-8 h-8 flex justify-center items-center">
                                <Settings className="w-[1.35rem] h-[1.35rem]" />
                            </div>
                        </a>
                    </div>
                </div>
                <Downloads navOpen={open} />
            </>
        );
    }

    return (
        <div
            className={
                "mx-auto pt-4 pb-4 min-h-0 max-h-full h-full transition-all duration-[400ms] bg-black overflow-hidden select-none" +
                (open ? " w-56 " : " w-12 ")
            }
            onMouseEnter={() => {
                setOpen(true);
            }}
            onMouseLeave={() => {
                setOpen(false);
            }}
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
                            <a
                                key={page.href}
                                href={page.href}
                                title={page.title}
                                className={`h-8 rounded-md items-center ml-2 mr-2 transition-all flex gap-2 ${
                                    activePage === page.name
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
                            </a>
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
                            <a
                                key={list.id}
                                href={`/${list.type}/${list.id}`}
                                title={list.name}
                                className={`h-8 rounded-md items-center ml-2 mr-2 transition-all flex gap-3 cursor-pointer md:hover:bg-[#414141]`}
                            >
                                <img
                                    className="w-8 h-8 flex items-center justify-center rounded-sm"
                                    src={
                                        list?.image
                                            ? `/api/image/${list.image}`
                                            : "/song-placeholder.png"
                                    }
                                />
                                <label className="font-semibold text-sm truncate cursor-pointer">
                                    {list.name}
                                </label>
                            </a>
                        );
                    })}
                    {/* Mockup de Pinned Artist */}
                    <a
                        href={`/artist/0`}
                        title={"Artist Mockup"}
                        className={`h-8 rounded-full items-center ml-2 mr-2 transition-all flex gap-3 md:hover:bg-[#414141] cursor-pointer`}
                    >
                        <img
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            src={"/user-placeholder.png"}
                        />
                        <label className="font-semibold text-sm truncate cursor-pointer">
                            Artist Mockup
                        </label>
                    </a>
                </div>

                {/* <div className="h-full"></div> */}
                <Downloads navOpen={open} />
            </div>
        </div>
    );
}
