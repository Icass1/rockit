import Link from "next/link";
import SearchBar from "@/components/Search/SearchBar";
import Image from "@/components/Image";
import HeaderUser from "@/components/Header/HeaderUser";
import { getSession } from "@/lib/auth/getSession";
import AddSessionProvider from "@/components/AddSessionProvider";
import { headers } from "next/headers";

export default async function Header() {
    const session = await getSession();

    const headerList = await headers();
    const pathname = headerList.get("x-current-path");

    return (
        <header
            className="text-whit z-50 grid w-full grid-cols-[200px_3fr_200px] justify-between py-4 pr-4 pl-4"
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

            {pathname?.startsWith("/radio") ? <label></label> : <SearchBar />}

            <div className="relative ml-auto">
                {session?.user ? (
                    <AddSessionProvider>
                        <HeaderUser />
                    </AddSessionProvider>
                ) : (
                    <Link
                        className="rounded bg-green-600 p-1 px-4"
                        href="/login"
                    >
                        Login
                    </Link>
                )}
            </div>
        </header>
    );
}
