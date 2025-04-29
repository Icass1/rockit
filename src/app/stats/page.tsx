"use client";

import { useState } from "react";
import UserStats from "@/components/Stats/UserStats";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";

export default function StatsPage() {
    const [selectedSection, setSelectedSection] = useState<string>("user");

    const updateSection = (section: string) => {
        setSelectedSection(section);
    };

    const $lang = useStore(langData);
    if (!$lang) return;

    const pages: { [key: string]: string } = {
        user: $lang.user,
        general: $lang.general,
        friends: $lang.friends,
    };

    return (
        <div className="mt-24 mb-20 flex h-full w-full flex-col overflow-y-auto px-6 pt-24 md:mt-3 md:mb-0 md:px-12">
            <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
                {/* Encabezado dinámico */}
                <h2 className="text-center text-2xl font-bold md:text-left">
                    {selectedSection === "user" && $lang.user_stats}
                    {selectedSection === "general" && $lang.general_stats}
                    {selectedSection === "friends" && $lang.friends_stats}
                </h2>

                {/* Toggle Switch */}
                <div className="flex space-x-1 rounded-lg bg-[#1a1a1a] px-1 py-1">
                    {["user", "general", "friends"].map((section) => (
                        <button
                            key={section}
                            className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                                selectedSection === section
                                    ? "bg-pink-700 text-white"
                                    : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                            }`}
                            onClick={() => updateSection(section)}
                        >
                            {pages[section].charAt(0).toUpperCase() +
                                pages[section].slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="my-4 h-full">
                <div>
                    {selectedSection === "user" && (
                        <div>
                            <UserStats />
                            <div className="min-h-24" />
                        </div>
                    )}

                    {selectedSection === "general" && (
                        <div className="text-center text-gray-400">
                            <p>
                                Aquí se mostrarán estadísticas generales de Rock
                                It!
                            </p>
                        </div>
                    )}

                    {selectedSection === "friends" && (
                        <div className="text-center text-gray-400">
                            <p>
                                Aquí se mostrarán estadísticas y comparativas
                                con tus amigos.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
