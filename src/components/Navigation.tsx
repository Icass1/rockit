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
} from "lucide-react";
import { useState } from "react";

export default function Navigation({ activePage }: { activePage: string }) {
    const [open, setOpen] = useState(false);

    const $pinnedLists = useStore(pinnedLists);

    const pages = [
        { name: "Home", href: "/", icon: Home },
        { name: "Library", href: "/library", icon: Library },
        { name: "Search", href: "/search", icon: Search },
    ];

    const [innerWidth] = useWindowSize();

    if (innerWidth < 768) {
        return (
            <>
                <div className="flex justify-center items-center py-2 w-full mx-auto min-w-0 max-w-full bg-[#1a1a1a]">
                    <div className="flex flex-row justify-center items-center md:pb-0 pb-8 w-full max-w-4xl">
                        {pages.map((page) => (
                            <a
                                key={page.href}
                                href={page.href}
                                title={page.name}
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
                {pages.map((page) => (
                    <a
                        key={page.href}
                        href={page.href}
                        title={page.name}
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
                            {page.name}
                        </label>
                    </a>
                ))}

                <a
                    key="/radio"
                    href="/radio"
                    title="Radio"
                    className={`h-8 rounded-md items-center ml-2 mr-2 transition-all flex gap-2 ${
                        activePage === "Radio"
                            ? "bg-white text-black"
                            : "text-white md:hover:bg-[#414141]"
                    }`}
                >
                    <div className="w-8 h-8 flex items-center justify-center">
                        <RadioTower className="w-5 h-5" />
                    </div>
                    <label className="font-semibold cursor-pointer">
                        Radio
                    </label>
                </a>

                <a
                    key="/friends"
                    href="/friends"
                    title="Friends"
                    className={`h-8 rounded-md items-center ml-2 mr-2 transition-all flex gap-2 ${
                        activePage === "Friends"
                            ? "bg-white text-black"
                            : "text-white md:hover:bg-[#414141]"
                    }`}
                >
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                    </div>
                    <label className="font-semibold cursor-pointer">
                        Friends
                    </label>
                </a>

                <a
                    key="/stats"
                    href="/stats"
                    title="Stats"
                    className={`h-8 rounded-md items-center ml-2 mr-2 transition-all flex gap-2 ${
                        activePage === "Stats"
                            ? "bg-white text-black"
                            : "text-white md:hover:bg-[#414141]"
                    }`}
                >
                    <div className="w-8 h-8 flex items-center justify-center">
                        <ChartLine className="w-5 h-5" />
                    </div>
                    <label className="font-semibold cursor-pointer">
                        Stats
                    </label>
                </a>

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
                        Pinned lists
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
                </div>

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

                {/* <div className="h-full"></div> */}
                <Downloads navOpen={open} />
            </div>
        </div>
    );
    //Aqui ignacio revisa lo de la cancion y el placeholder que no va bien (Lineas 526-530)
}
