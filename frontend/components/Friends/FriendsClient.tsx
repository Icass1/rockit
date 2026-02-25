"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Forward, Play } from "lucide-react";
import Image from "next/image";

export default function FriendsClient() {
    const { langFile: lang } = useLanguage();

    if (!lang) return false;
    return (
        <div className="my-20 flex flex-col px-2 md:mt-20 md:flex-row md:px-12">
            <div className="mt-8 flex flex-1 flex-col justify-between md:flex-row md:space-x-14">
                {/* Columna izquierda */}
                <div className="flex flex-1 flex-col items-center space-y-6">
                    {/* SVG Gráfico circular */}
                    <div className="relative flex items-center justify-center">
                        <svg
                            className="h-full w-full -rotate-90 transform"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 120 120"
                        >
                            <defs>
                                <linearGradient
                                    id="gradient"
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="100%"
                                >
                                    <stop offset="0%" stopColor="#ee1086" />
                                    <stop offset="100%" stopColor="#fb6467" />
                                </linearGradient>
                            </defs>
                            <circle
                                cx="60"
                                cy="60"
                                r="50"
                                className="text-gray-200"
                                strokeWidth="5"
                                fill="none"
                            />
                            <circle
                                cx="60"
                                cy="60"
                                r="50"
                                stroke="url(#gradient)"
                                strokeWidth="5"
                                fill="none"
                                strokeDasharray="300"
                                strokeDashoffset="78.539"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="absolute text-3xl font-semibold text-white">
                            Niv. 72
                        </span>
                    </div>

                    <p className="text-4xl font-semibold text-white"></p>
                    <p className="text-md text-center text-gray-400 md:px-6">
                        {lang.friends_points_descr}
                    </p>
                </div>

                {/* Columna central */}
                <div className="relative my-14 flex flex-1 flex-col items-center md:my-0">
                    <h1 className="pb-4 text-2xl font-bold text-white md:text-3xl">
                        {lang.shared_2_you}
                    </h1>
                    <div className="h-[calc(100vh-30rem)] w-full space-y-6 overflow-y-scroll p-6 md:h-auto">
                        {Array.from({ length: 10 }).map((_, index) => (
                            <div
                                key={index}
                                className="group relative flex w-full items-center space-x-4 rounded-md bg-neutral-700 p-4"
                            >
                                <div className="relative h-24 w-24 hover:cursor-pointer">
                                    <Image
                                        width={96}
                                        height={96}
                                        src="/song-placeholder.png"
                                        alt=""
                                        className="h-full w-full rounded-md object-cover transition-opacity group-hover:opacity-40"
                                    />
                                    <Play className="absolute inset-0 m-auto h-8 w-8 fill-current text-4xl opacity-0 transition-opacity group-hover:opacity-100" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <p className="truncate text-left text-lg font-semibold hover:underline">
                                        Nombre de la canción {index + 1}
                                    </p>
                                    <p className="text-md truncate text-left text-gray-400 hover:underline">
                                        Autor de la canción {index + 1}
                                    </p>
                                    <p className="truncate text-left text-sm text-gray-400 hover:underline">
                                        Álbum de la canción {index + 1}
                                    </p>
                                </div>
                                <div className="absolute -top-3 -right-2 flex items-center space-x-2 rounded-md bg-gradient-to-r from-[#ee1086] to-[#ce5254] px-2 text-sm text-white">
                                    <Forward className="h-7" />
                                    <span>
                                        {lang.shared_from} &apos;user{" "}
                                        {index + 1}&apos;
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Columna derecha */}
                <div className="flex h-fit flex-1 flex-col space-y-4 rounded-2xl bg-neutral-900 p-4 md:bg-neutral-800">
                    <div className="flex items-center justify-center py-3">
                        <h1 className="text-center text-2xl font-bold text-white md:text-3xl">
                            {lang.users_friends}
                        </h1>
                    </div>

                    <div className="my-4 flex items-center rounded-full bg-neutral-700 p-2 md:mx-14">
                        <input
                            type="search"
                            placeholder="Buscar usuarios..."
                            className="flex-1 bg-transparent px-2 text-white placeholder-gray-400 outline-none"
                        />
                        <i className="fas fa-search text-gray-400" />
                    </div>

                    {/* Lista de solicitudes */}
                    <div className="flex flex-col space-y-4 overflow-y-auto pt-3">
                        <h2 className="text-left font-semibold text-white">
                            {lang.pending_requests}
                        </h2>
                        {/* Render solicitudes acá... igual que antes */}
                    </div>

                    {/* Lista de amigos */}
                    <div className="flex flex-col space-y-4 overflow-y-auto pt-3">
                        <h2 className="text-left font-semibold text-white">
                            {lang.friends_list}
                        </h2>
                        {/* Render amigos acá... */}
                    </div>

                    {/* Lista de usuarios */}
                    <div className="flex flex-col space-y-4 overflow-y-auto pt-3">
                        <h2 className="text-left font-semibold text-white">
                            {lang.users_list}
                        </h2>
                        {/* Render usuarios acá... */}
                    </div>
                </div>
            </div>
        </div>
    );
}
