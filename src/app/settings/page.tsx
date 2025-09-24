"use client";

import Image from "@/components/Image";
import ChangeLang from "@/components/Settings/ChangeLang";
import CrossFadeInput from "@/components/Settings/CrossFadeInput";
import DownloadAppButton from "@/components/Settings/DownloadAppButton";
import LogOutButton from "@/components/Settings/LogOutButton";
import ServiceWorkerInfo from "@/components/Settings/ServiceWorkerInfo";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";
import { ChartLine, ImageUp } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

function DisplayName() {
    const session = useSession();

    if (session.status == "loading")
        return (
            <h2 className="mt-4 text-xl font-bold text-white md:text-3xl">
                Loading
            </h2>
        );
    if (session.status == "unauthenticated") {
        console.warn("DisplayName -> /login")
        location.href = "/login";
    }

    return (
        <h2 className="mt-4 text-xl font-bold text-white md:text-3xl">
            {session.data?.user.username}
        </h2>
    );
}

function Username() {
    const session = useSession();

    if (session.status == "loading")
        return <p className="text-base text-gray-500 md:text-lg">Loading</p>;
    if (session.status == "unauthenticated") {
        console.warn("Username -> /login")
        location.href = "/login";
    }

    return (
        <p className="text-base text-gray-500 md:text-lg">
            @{session.data?.user.username}
        </p>
    );
}

function ChangeUsername() {
    const session = useSession();

    if (session.status == "loading")
        return <p className="text-base text-gray-500 md:text-lg">Loading</p>;

    if (session.status == "unauthenticated") {
        console.warn("ChangeUsername -> /login")
        location.href = "/login";
    }

    return (
        <input
            onChange={() => {
                console.warn("TO DO");
            }}
            type="search"
            className="w-full rounded-lg border border-[#333] bg-[#1e1e1e] p-3 text-white focus:ring-2 focus:ring-[#ec5588] focus:outline-none"
            value={session.data?.user.username}
        />
    );
}

export default function Settings() {
    const $lang = useStore(langData);

    if (!$lang) return false;

    return (
        <div className="relative flex h-full flex-col overflow-y-auto pt-24 md:h-[calc(100%_-_6rem)] md:overflow-y-hidden">
            <div className="flex w-full flex-col items-center gap-8 px-4 md:h-full md:flex-row md:items-start md:gap-16 md:px-0">
                {/* Columna izquierda */}
                <div className="flex w-full flex-col items-center justify-center border-b border-gray-700 pb-8 md:mt-0 md:h-full md:w-1/3 md:border-r md:border-b-0 md:pb-0">
                    <div className="group relative flex items-center justify-center">
                        {/* Imagen de perfil */}
                        <Image
                            src={"/user-placeholder.png"}
                            alt="User Profile Picture"
                            className="h-48 rounded-full bg-neutral-400 object-cover shadow-md transition duration-300 md:h-72"
                        />
                        {/* Overlay con ícono al hacer hover - CUANDO HAYA IMAGEN HAY QUE OCULTAR EL ICONO*/}
                        <div className="absolute inset-0 flex aspect-square cursor-pointer items-center justify-center rounded-full bg-black/20 transition duration-300 md:h-full md:opacity-0 md:group-hover:opacity-100">
                            <ImageUp className="h-16 w-16 text-white md:h-24 md:w-24" />
                        </div>
                    </div>
                    {/* Display name */}
                    <DisplayName />

                    {/* Username */}
                    <Username />

                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                        {/* Botón de log out */}
                        <LogOutButton />

                        {/* Botón de estadísticas */}
                        <Link
                            className="flex w-40 items-center justify-center gap-2 rounded-lg bg-blue-700 py-2 font-bold text-white shadow-md transition duration-300 hover:bg-blue-900 md:hidden"
                            href="/stats"
                        >
                            <ChartLine className="h-5 w-5" />
                            See User Stats
                        </Link>
                    </div>
                </div>

                {/* Columna derecha */}
                <div className="flex h-full w-full flex-col gap-y-4 md:w-2/3 md:gap-y-6 md:overflow-y-auto md:pr-[30%] md:pl-1">
                    <h2 className="top-0 z-10 bg-gradient-to-b from-[rgb(11,11,11)] to-transparent py-2 text-center text-xl font-bold text-white md:sticky md:text-2xl">
                        {$lang.user_settings}
                    </h2>
                    {/* Cambiar nombre de usuario */}
                    <div>
                        <label className="mb-2 block text-sm text-gray-300 md:text-lg">
                            {$lang.display_name}
                        </label>
                        <ChangeUsername />
                    </div>

                    {/* Cambiar idioma */}
                    <ChangeLang />

                    {/* Cambiar contraseña */}
                    <form>
                        <div>
                            <label className="mb-2 block text-sm text-gray-300 md:text-lg">
                                {$lang.change_password}
                            </label>
                            <input
                                type="password"
                                autoComplete="new-password"
                                placeholder={$lang.new_password}
                                className="w-full rounded-lg border border-[#333] bg-[#1e1e1e] p-3 text-white focus:ring-2 focus:ring-[#ec5588] focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm text-gray-300 md:text-lg">
                                {$lang.repeat_password}
                            </label>
                            <input
                                type="password"
                                autoComplete="new-password"
                                placeholder={$lang.repeat_password}
                                className="w-full rounded-lg border border-[#333] bg-[#1e1e1e] p-3 text-white focus:ring-2 focus:ring-[#ec5588] focus:outline-none"
                            />
                        </div>
                    </form>

                    <div>
                        <h2 className="mb-2 text-xl font-bold text-white md:text-2xl">
                            Cross Fade
                        </h2>
                        <CrossFadeInput />
                    </div>

                    <DownloadAppButton />
                    <ServiceWorkerInfo />
                    <div className="block min-h-24 md:min-h-16"></div>
                </div>
            </div>
        </div>
    );
}
