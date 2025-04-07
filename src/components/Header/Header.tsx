import Link from "next/link";
import SearchBar from "@/components/Search/SearchBar";
import Image from "@/components/Image";
import HeaderUser from "@/components/Header/HeaderUser";
import { getSession } from "@/lib/auth/getSession";
import AddSessionProvider from "../AddSessionProvider";

export default async function Header() {
    const session = await getSession();

    return (
        <header
            className="w-full z-50 grid grid-cols-[200px_3fr_200px] justify-between pl-4 pr-4 py-4 text-whit"
            style={{ backdropFilter: "blur(10px)" }}
        >
            <Link href="/" className="flex items-center select-none">
                <Image
                    width={2048}
                    height={614}
                    src="/logo-banner.png"
                    alt="Logo"
                    className="h-14"
                />
            </Link>

            <SearchBar />

            <div className="relative ml-auto">
                {session?.user ? (
                    <AddSessionProvider>
                        <HeaderUser />
                    </AddSessionProvider>
                ) : (
                    <a className="p-1 bg-green-600 rounded px-4" href="/login">
                        Login
                    </a>
                )}
            </div>
        </header>
    );
}
