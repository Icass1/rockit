import { Home, Menu, Library, Search, Download } from "lucide-react";
import { useState } from "react";

export default function Navigation({ activePage }: { activePage: string }) {
    const [open, setOpen] = useState(false);

    const pages = [
        { name: "Home", href: "/", icon: Home },
        { name: "Library", href: "/library", icon: Library },
        { name: "Search", href: "/search", icon: Search },
        { name: "Downloads", href: "/downloads", icon: Download },
    ];

    return (
        <div
            className={
                "mx-auto  pt-4 min-h-0 max-h-full h-full transition-all duration-[400ms] bg-black overflow-hidden " +
                (open ? " w-56 " : " w-12 ")
            }
        >
            <div className="w-56 flex flex-col gap-4">
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
                                : "text-white hover:bg-[#414141]"
                        }`}
                    >
                        <div className="w-8 h-8 flex items-center justify-center">
                            <page.icon className="w-5 h-5" />
                        </div>
                        <label className="font-semibold">{page.name}</label>
                    </a>
                ))}
            </div>
        </div>
    );
}
