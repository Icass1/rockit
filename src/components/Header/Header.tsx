import Link from "next/link";
import SearchBar from "@/components/Search/SearchBar";
import Image from "@/components/Image";
import HeaderUser from "@/components/Header/HeaderUser";
import OnlineUserIndicator from "./HeaderOnlineUsers";
import { getSession } from "@/lib/auth/getSession";
import { headers } from "next/headers";

export default async function Header() {
    const session = await getSession();

    const headerList = await headers();
    const pathname = headerList.get("x-current-path");

    return (
        <header
            className="z-50 grid w-full grid-cols-[33%_33%_32%] justify-between py-4 pr-4 pl-4 text-white md:bg-[#1a1a1a]/30"
            style={{ backdropFilter: "blur(10px)" }}
        >
            <Link href="/" className="flex flex-row items-center select-none">
                <Image
                    width={2048}
                    height={614}
                    src="/logo-banner.png"
                    alt="Logo"
                    className="h-14"
                />
            </Link>

            {pathname?.startsWith("/radio") ? <label></label> : <SearchBar />}

            <div className="relative ml-auto flex items-center gap-5">
                <OnlineUserIndicator />

                {session?.user ? (
                    <HeaderUser />
                ) : (
                    <a className="rounded bg-green-600 p-1 px-4" href="/login">
                        Login
                    </a>
                )}
            </div>
        </header>
    );
}
